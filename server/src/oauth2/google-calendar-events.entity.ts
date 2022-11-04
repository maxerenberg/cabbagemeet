import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';
import Meeting from '../meetings/meeting.entity';
import GoogleOAuth2 from './google-oauth2.entity';

export type GoogleCalendarEvent = {
  ID: string;
  summary: string;
  start: string;  // e.g. "2022-10-23T13:00:00-04:00"
  end: string;    // e.g. "2022-10-23T14:00:00-04:00"
};

@Entity('GoogleCalendarEvents')
export default class GoogleCalendarEvents {
  @PrimaryColumn()
  MeetingID: number;

  @PrimaryColumn()
  UserID: number;

  // JSON-serialized array of GoogleCalendarEvent
  @Column()
  Events: string;

  // The date used in the timeMin parameter of the previous API request
  // See https://developers.google.com/calendar/api/v3/reference/events/list#parameters
  @Column()
  MeetingMinDate: string;

  // The date used in the timeMax parameter of the previous API request
  // See https://developers.google.com/calendar/api/v3/reference/events/list#parameters
  @Column()
  MeetingMaxDate: string;

  // See https://developers.google.com/calendar/api/guides/sync
  @Column({nullable: true})
  SyncToken?: string;

  @ManyToOne(() => Meeting, meeting => meeting.GoogleCalendarEvents, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'MeetingID'})
  Meeting: Meeting;

  @ManyToOne(() => GoogleOAuth2, googleOAuth2 => googleOAuth2.Events, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'UserID'})
  GoogleOAuth2: GoogleOAuth2;
}
