import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import ConfigService from '../config/config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import MailService from '../mail/mail.service';
import OAuth2Service from '../oauth2/oauth2.service';
import User from '../users/user.entity';
import { Repository } from 'typeorm';
import MeetingRespondent from './meeting-respondent.entity';
import Meeting from './meeting.entity';

export class NoSuchMeetingError extends Error {}

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
  private readonly publicURL: string;

  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    @InjectRepository(MeetingRespondent)
    private respondentsRepository: Repository<MeetingRespondent>,
    private readonly mailService: MailService,
    private moduleRef: ModuleRef,
    configService: ConfigService,
  ) {
    this.publicURL = configService.get('PUBLIC_URL');
  }

  onModuleInit() {
    // circular dependency
    this.oauth2Service = this.moduleRef.get(OAuth2Service, { strict: false });
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

  async getRespondent(respondentID: number): Promise<MeetingRespondent | null>;
  async getRespondent(
    meetingID: number,
    userID: number,
  ): Promise<MeetingRespondent | null>;
  async getRespondent(
    respondentIDOrMeetingID: number,
    userID?: number,
  ): Promise<MeetingRespondent | null> {
    if (userID === undefined) {
      return this.respondentsRepository.findOneBy({
        RespondentID: respondentIDOrMeetingID,
      });
    }
    return this.respondentsRepository.findOneBy({
      MeetingID: respondentIDOrMeetingID,
      UserID: userID,
    });
  }

  async addRespondent(
    meetingID: number,
    availabilities: string[],
    userID: number,
  ): Promise<MeetingRespondent>;
  async addRespondent(
    meetingID: number,
    availabilities: string[],
    guestName: string,
    guestEmail?: string,
  ): Promise<MeetingRespondent>;
  async addRespondent(
    meetingID: number,
    availabilities: string[],
    userIDOrGuestName: number | string,
    guestEmail?: string,
  ): Promise<MeetingRespondent> {
    const respondent: Partial<MeetingRespondent> = {
      MeetingID: meetingID,
      Availabilities: availabilities,
    };
    if (typeof userIDOrGuestName === 'number') {
      respondent.UserID = userIDOrGuestName;
    } else {
      respondent.GuestName = userIDOrGuestName;
      respondent.GuestEmail = guestEmail || null;
    }
    return this.respondentsRepository.save(respondent);
  }

  async updateRespondent(
    respondentID: number,
    availabilities: string[],
  ): Promise<MeetingRespondent | null> {
    // TODO: wrap in transaction
    await this.respondentsRepository.update(respondentID, {
      Availabilities: availabilities,
    });
    return this.respondentsRepository.findOneBy({ RespondentID: respondentID });
  }

  async addOrUpdateRespondent(
    meetingID: number,
    userID: number,
    availabilities: string[],
  ): Promise<Meeting> {
    const existingRespondent = await this.getRespondent(meetingID, userID);
    if (existingRespondent) {
      await this.updateRespondent(
        existingRespondent.RespondentID,
        availabilities,
      );
    } else {
      await this.addRespondent(meetingID, availabilities, userID);
    }
    // TODO: wrap in transaction
    const updatedMeeting = await this.getMeetingWithRespondents(meetingID);
    // Update respondent's external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryCreateOrUpdateEventsForMeetingForSingleRespondent(
      userID,
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
