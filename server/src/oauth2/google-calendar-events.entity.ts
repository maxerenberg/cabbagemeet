import { Entity, Column, PrimaryColumn, ManyToOne, Index } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
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

  @Index()
  @PrimaryColumn()
  UserID: number;

  @Column({type: 'simple-json'})
  Events: GoogleCalendarEvent[];

  // The timeMin parameter used in the previous API request
  // See https://developers.google.com/calendar/api/v3/reference/events/list#parameters
  @Column()
  PrevTimeMin: string;

  // The timeMax parameter used in the previous API request
  // See https://developers.google.com/calendar/api/v3/reference/events/list#parameters
  @Column()
  PrevTimeMax: string;

  // See https://developers.google.com/calendar/api/guides/sync
  @Column({nullable: true})
  SyncToken?: string;

  @ManyToOne(() => Meeting, meeting => meeting.GoogleCalendarEvents, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'MeetingID'})
  Meeting: Meeting;

  @ManyToOne(() => GoogleOAuth2, googleOAuth2 => googleOAuth2.Events, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'UserID'})
  GoogleOAuth2: GoogleOAuth2;
}
