import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { FindOptionsWhere, Repository } from 'typeorm';
import ConfigService from '../config/config.service';
import type { DatabaseType } from '../config/env.validation';
import { normalizeDBError, ForeignKeyConstraintFailed } from '../database.utils';
import MailService from '../mail/mail.service';
import { assert } from '../misc.utils';
import OAuth2Service from '../oauth2/oauth2.service';
import User from '../users/user.entity';
import UsersService from '../users/users.service';
import MeetingRespondent from './meeting-respondent.entity';
import Meeting from './meeting.entity';

export class NoSuchMeetingError extends Error {
  constructor() {
    super('No such meeting');
  }
}
export class NoSuchRespondentError extends Error {
  constructor() {
    super('No such respondent');
  }
}

function formatScheduledTimeRange(
  startDateTime: string,
  endDateTime: string,
  tz: string,
): {
  dayString: string;
  timeRangeString: string;
} {
  const startDate = DateTime.fromISO(startDateTime).setZone(tz);
  // remove space so that e.g. "8:00 AM" becomes "8:00AM"
  const startTime = startDate
    .toLocaleString(DateTime.TIME_SIMPLE)
    .replace(' ', '');
  const endTime = DateTime.fromISO(endDateTime)
    .setZone(tz)
    .toLocaleString(DateTime.TIME_SIMPLE)
    .replace(' ', '');
  const tzShort = startDate.offsetNameShort;
  return {
    // See https://moment.github.io/luxon/#/formatting?id=presets
    // Looks like e.g. "Wednesday, December 21, 2022"
    dayString: startDate.toLocaleString(DateTime.DATE_HUGE),
    timeRangeString: `${startTime} to ${endTime} ${tzShort}`,
  };
}

@Injectable()
export default class MeetingsService {
  private oauth2Service: OAuth2Service;
  private usersService: UsersService;
  private readonly publicURL: string;
  private readonly dbType: DatabaseType;

  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    @InjectRepository(MeetingRespondent)
    private respondentsRepository: Repository<MeetingRespondent>,
    private readonly mailService: MailService,
    private moduleRef: ModuleRef,
    configService: ConfigService,
  ) {
    this.publicURL = configService.get('PUBLIC_URL');
    this.dbType = configService.get('DATABASE_TYPE');
  }

  onModuleInit() {
    // circular dependencies
    this.oauth2Service = this.moduleRef.get(OAuth2Service, { strict: false });
    this.usersService = this.moduleRef.get(UsersService, { strict: false });
  }

  createMeeting(partialMeeting: Partial<Meeting>): Promise<Meeting> {
    return this.meetingsRepository.save(partialMeeting);
  }

  async getMeetingOrThrow(meetingID: number): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOneBy({ ID: meetingID });
    if (!meeting) {
      throw new NoSuchMeetingError();
    }
    return meeting;
  }

  getMeetingWithRespondents(meetingID: number): Promise<Meeting | null> {
    return this.meetingsRepository
      .createQueryBuilder()
      .leftJoin('Meeting.Respondents', 'MeetingRespondent')
      .leftJoin('MeetingRespondent.User', 'User')
      .select(['Meeting', 'MeetingRespondent', 'User.ID', 'User.Name'])
      .where('Meeting.ID = :meetingID', { meetingID })
      .getOne();
  }

  private getRespondentsWithNotificationsEnabled(
    meetingID: number,
  ): Promise<MeetingRespondent[]> {
    return this.respondentsRepository
      .createQueryBuilder()
      .leftJoin('MeetingRespondent.User', 'User')
      .select([
        // !!!!!!!!!!
        // There appears to be a bug in TypeORM where non-guest respondents
        // get dropped from the result if the MeetingID column is not selected.
        // They show up in the "raw" results, but not in the list of entities
        // returned from getMany().
        // So we need to select the MeetingID even though it's redundant.
        // !!!!!!!!!!
        'MeetingRespondent.MeetingID',
        'MeetingRespondent.GuestName',
        'MeetingRespondent.GuestEmail',
        'User.ID',
        'User.Name',
        'User.Email',
      ])
      .where('MeetingRespondent.MeetingID = :meetingID', { meetingID })
      .andWhere(
        '(MeetingRespondent.GuestEmail IS NOT NULL OR User.IsSubscribedToNotifications)',
      )
      .getMany();
  }

  private async updateMeetingDB(
    meeting: Meeting,
    meetingInfo: Partial<Meeting>,
  ) {
    // TODO: use a transaction to wrap the initial read of the meeting + the update
    await this.meetingsRepository.update(meeting.ID, meetingInfo);
    Object.assign(meeting, meetingInfo);
  }

  async editMeeting(meeting: Meeting, partialUpdate: Partial<Meeting>) {
    const { Name: oldName, About: oldAbout } = meeting;
    await this.updateMeetingDB(meeting, partialUpdate);
    if (
      meeting.ScheduledStartDateTime !== null &&
      meeting.ScheduledEndDateTime !== null &&
      (meeting.Name !== oldName || meeting.About !== oldAbout)
    ) {
      // Update respondents' external calendars
      // Do not await the Promise so that we don't block the caller
      this.oauth2Service.tryCreateOrUpdateEventsForMeetingForAllRespondents(
        meeting,
      );
    }
  }

  private createScheduledNotificationEmailBody(
    meeting: Meeting,
    name: string,
  ): string {
    const {dayString, timeRangeString} = formatScheduledTimeRange(
      meeting.ScheduledStartDateTime,
      meeting.ScheduledEndDateTime,
      meeting.Timezone,
    );
    return (
      `Hello ${name},\n` +
      '\n' +
      `The meeting "${meeting.Name}" has been scheduled:\n` +
      '\n' +
      `  ${dayString}\n` +
      `  ${timeRangeString}\n` +
      '\n' +
      `View details here: ${this.publicURL}/m/${meeting.ID}\n` +
      '\n' +
      '-- \n' +
      `CabbageMeet | ${this.publicURL}\n`
    );
  }

  async scheduleMeeting(
    maybeUser: User | null,
    meeting: Meeting,
    startDateTime: string,
    endDateTime: string,
  ) {
    // Update database
    const { WasScheduledAtLeastOnce: wasScheduledAtLeastOnce } = meeting;
    const updatedInfo: Partial<Meeting> = {
      ScheduledStartDateTime: startDateTime,
      ScheduledEndDateTime: endDateTime,
      WasScheduledAtLeastOnce: true,
    };
    await this.updateMeetingDB(meeting, updatedInfo);
    // Send email notifications
    if (!wasScheduledAtLeastOnce) {
      const respondentsToBeNotified =
        await this.getRespondentsWithNotificationsEnabled(meeting.ID);
      for (const respondent of respondentsToBeNotified) {
        if (maybeUser && respondent.User?.ID === maybeUser.ID) {
          // Don't notify the person who scheduled the meeting
          continue;
        }
        const recipient = respondent.GuestEmail || respondent.User.Email;
        const name = respondent.GuestName || respondent.User.Name;
        // Do not await the Promise so that we don't block the caller
        this.mailService.sendNowOrLater({
          recipient,
          subject: `${meeting.Name} has been scheduled`,
          body: this.createScheduledNotificationEmailBody(meeting, name),
        });
      }
    }
    // Update respondents' external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryCreateOrUpdateEventsForMeetingForAllRespondents(
      meeting,
    );
  }

  async unscheduleMeeting(meeting: Meeting) {
    const updatedInfo: Partial<Meeting> = {
      ScheduledStartDateTime: null,
      ScheduledEndDateTime: null,
    };
    await this.updateMeetingDB(meeting, updatedInfo);
    // Update respondents' external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryDeleteEventsForMeetingForAllRespondents(meeting.ID);
  }

  async deleteMeeting(meetingID: number): Promise<void> {
    // This meeting needs to be deleted from all of the respondents' Google calendars.
    // We need to wait until this runs to completion or else the row in
    // the GoogleCalendarCreatedEvents table might be deleted prematurely
    // (due to cascading deletions).
    // Unfortunately this might take a long time, but since deleting a meeting is a
    // relatively infrequent operation, it should be acceptable. The use of
    // Promise.allSettled() in the OAuth2Service should hopefully speed things up.
    //
    // Alternative solution: use a tombstoned row
    await this.oauth2Service.tryDeleteEventsForMeetingForAllRespondents(
      meetingID,
    );
    await this.meetingsRepository.delete(meetingID);
  }

  async getRespondent(where: FindOptionsWhere<MeetingRespondent>): Promise<MeetingRespondent | null> {
    return this.respondentsRepository.findOneBy(where);
  }

  private async sendRespondentAddedNotification(meeting: Meeting, {
    user, guestName,
  }: {user?: User, guestName?: string}) {
    if (!meeting.CreatorID) {
      return;
    }
    if (user && user.ID === meeting.CreatorID) {
      // Don't want to notify someone if they added their availabilities
      // for their own meeting
      return;
    }
    const meetingCreator = await this.usersService.findOneByID(meeting.CreatorID);
    if (!meetingCreator.IsSubscribedToNotifications) {
      return;
    }
    const respondentName = user?.Name ?? guestName;
    const body =
`Hello ${meetingCreator.Name},

${respondentName} has added their availabilities to the meeting "${meeting.Name}".

Please visit ${this.publicURL}/m/${meeting.ID} for details.

--${' '}
CabbageMeet | ${this.publicURL}
`;
    await this.mailService.sendNowOrLater({
      subject: `${respondentName} responded to "${meeting.Name}"`,
      recipient: meetingCreator.Email,
      body,
    });
  }

  async addRespondent({
    meetingID,
    availabilities,
    user,
    guestName,
    guestEmail,
  }: {
    meetingID: number,
    availabilities: string[],
    user?: User,
    guestName?: string,
    guestEmail?: string,
  }): Promise<Meeting> {
    const respondent: Partial<MeetingRespondent> = {
      MeetingID: meetingID,
      Availabilities: availabilities,
    };
    if (user) {
      respondent.UserID = user.ID;
    } else {
      assert(guestName, 'guestName should have been set');
      respondent.GuestName = guestName;
      respondent.GuestEmail = guestEmail || null;
    }
    try {
      await this.respondentsRepository.insert(respondent);
    } catch (err) {
      err = normalizeDBError(err as Error, this.dbType);
      if (err instanceof ForeignKeyConstraintFailed) {
        throw new NoSuchMeetingError();
      }
      throw err;
    }
    const meeting = await this.getMeetingWithRespondents(meetingID);
    // Do not await the promise to avoid blocking the client
    this.sendRespondentAddedNotification(meeting, {user, guestName});
    return meeting;
  }

  async updateRespondent(
    respondentID: number,
    meetingID: number,
    availabilities: string[],
  ): Promise<Meeting> {
    // TODO: wrap in transaction
    const result = await this.respondentsRepository.update({
      RespondentID: respondentID,
      MeetingID: meetingID,
    }, {
      Availabilities: availabilities,
    });
    if (result.affected === 0) {
      throw new NoSuchRespondentError();
    }
    return this.getMeetingWithRespondents(meetingID);
  }

  async addOrUpdateRespondent(
    meetingID: number,
    user: User,
    availabilities: string[],
  ): Promise<Meeting> {
    const existingRespondent = await this.getRespondent({MeetingID: meetingID, UserID: user.ID});
    let updatedMeeting: Meeting | undefined;
    if (existingRespondent) {
      updatedMeeting = await this.updateRespondent(
        existingRespondent.RespondentID,
        meetingID,
        availabilities,
      );
    } else {
      updatedMeeting = await this.addRespondent({meetingID, availabilities, user});
    }
    // Update respondent's external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryCreateOrUpdateEventsForMeetingForSingleRespondent(
      user.ID,
      updatedMeeting,
    );
    return updatedMeeting;
  }

  async deleteRespondent(respondent: MeetingRespondent): Promise<Meeting> {
    if (respondent.UserID !== null) {
      // We need to wait until this runs to completion or else the row in
      // the GoogleCalendarCreatedEvents table might be deleted prematurely
      // (due to cascading deletions).
      await this.oauth2Service.tryDeleteEventsForMeetingForSingleRespondent(
        respondent.UserID,
        respondent.MeetingID,
      );
    }
    await this.respondentsRepository.delete(respondent.RespondentID);
    // TODO: wrap in transaction
    return this.getMeetingWithRespondents(respondent.MeetingID);
  }

  async getMeetingsCreatedBy(userID: number): Promise<Meeting[]> {
    // TODO: support cursor-based pagination
    return this.meetingsRepository
      .createQueryBuilder()
      .select(['Meeting'])
      .where('CreatorID = :userID', { userID })
      .orderBy('ID', 'DESC')
      .limit(100)
      .getMany();
  }

  async getMeetingsRespondedToBy(userID: number): Promise<Meeting[]> {
    // TODO: support cursor-based pagination
    return this.meetingsRepository
      .createQueryBuilder()
      .innerJoin('Meeting.Respondents', 'MeetingRespondent')
      .select(['Meeting'])
      .where('MeetingRespondent.UserID = :userID', { userID })
      .orderBy('ID', 'DESC')
      .limit(100)
      .getMany();
  }
}
