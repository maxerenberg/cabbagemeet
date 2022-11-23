import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import MeetingRespondent from './meeting-respondent.entity';
import Meeting from './meeting.entity';

export class NoSuchMeetingError extends Error {}

// TODO: delete meetings after their max. tentative date or scheduled date (cron job)

@Injectable()
export default class MeetingsService {
  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    @InjectRepository(MeetingRespondent) private respondentsRepository: Repository<MeetingRespondent>,
  ) {}

  async createMeeting(meeting: DeepPartial<Meeting>): Promise<Meeting> {
    return this.meetingsRepository.save(meeting);
  }

  async getMeetingOrThrow(meetingID: number): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOneBy({ID: meetingID});
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
      .where('Meeting.ID = :meetingID', {meetingID})
      .getOne();
  }

  async updateMeeting(meetingID: number, meetingInfo: DeepPartial<Meeting>): Promise<Meeting> {
    // TODO: wrap in transaction
    await this.meetingsRepository.update(meetingID, meetingInfo);
    return this.getMeetingWithRespondents(meetingID);
  }

  async deleteMeeting(meetingID: number): Promise<void> {
    await this.meetingsRepository.delete(meetingID);
  }

  async getRespondent(respondentID: number): Promise<MeetingRespondent | null>;
  async getRespondent(meetingID: number, userID: number): Promise<MeetingRespondent | null>;
  async getRespondent(respondentIDOrMeetingID: number, userID?: number): Promise<MeetingRespondent | null> {
    if (userID === undefined) {
      return this.respondentsRepository.findOneBy({RespondentID: respondentIDOrMeetingID});
    }
    return this.respondentsRepository.findOneBy({MeetingID: respondentIDOrMeetingID, UserID: userID});
  }

  async addRespondent(meetingID: number, availabilities: string[], userID: number): Promise<MeetingRespondent>;
  async addRespondent(meetingID: number, availabilities: string[], guestName: string, guestEmail?: string): Promise<MeetingRespondent>;
  async addRespondent(meetingID: number, availabilities: string[], userIDOrGuestName: number | string, guestEmail?: string): Promise<MeetingRespondent> {
    const respondent: DeepPartial<MeetingRespondent> = {
      MeetingID: meetingID,
      Availabilities: JSON.stringify(availabilities),
    };
    if (typeof userIDOrGuestName === 'number') {
      respondent.UserID = userIDOrGuestName;
    } else {
      respondent.GuestName = userIDOrGuestName;
      respondent.GuestEmail = guestEmail || null;
    }
    return this.respondentsRepository.save(respondent);
  }

  async updateRespondent(respondentID: number, availabilities: string[]): Promise<MeetingRespondent | null> {
    // TODO: wrap in transaction
    await this.respondentsRepository.update(
      respondentID,
      {Availabilities: JSON.stringify(availabilities)},
    );
    return this.respondentsRepository.findOneBy({RespondentID: respondentID});
  }

  async deleteRespondent(respondentID: number): Promise<void> {
    await this.respondentsRepository.delete(respondentID);
  }

  getMeetingsCreatedBy(userID: number): Promise<Meeting[]> {
    // TODO: support cursor-based pagination
    return this.meetingsRepository
      .createQueryBuilder()
      .select(['Meeting'])
      .where('CreatorID = :userID', {userID})
      .limit(100)
      .getMany();
  }

  async getMeetingsRespondedToBy(userID: number): Promise<Meeting[]> {
    // TODO: support cursor-based pagination
    return await this.meetingsRepository
      .createQueryBuilder()
      .innerJoin('Meeting.Respondents', 'MeetingRespondent')
      .select(['Meeting'])
      .where('MeetingRespondent.UserID = :userID', {userID})
      .limit(100)
      .getMany();
  }
}
