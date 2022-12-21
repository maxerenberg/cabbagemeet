import { Entity, Column, PrimaryColumn, ManyToOne, Index } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import Meeting from '../meetings/meeting.entity';
import GoogleOAuth2 from './google-oauth2.entity';
import type { OAuth2CalendarEvent } from './oauth2-common';

@Entity('GoogleCalendarEvents')
export default class GoogleCalendarEvents {
  @PrimaryColumn()
  MeetingID: number;

  @Index()
  @PrimaryColumn()
  UserID: number;

  @Column({ type: 'simple-json' })
  Events: OAuth2CalendarEvent[];

  // The timeMin parameter used in the previous API request
  // See https://developers.google.com/calendar/api/v3/reference/events/list#parameters
  @Column()
  PrevTimeMin: string;

  // The timeMax parameter used in the previous API request
  // See https://developers.google.com/calendar/api/v3/reference/events/list#parameters
  @Column()
  PrevTimeMax: string;

  // See https://developers.google.com/calendar/api/guides/sync
  @Column({ type: 'text' })
  SyncToken: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.GoogleCalendarEvents, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'MeetingID' })
  Meeting: Meeting;

  @ManyToOne(() => GoogleOAuth2, (googleOAuth2) => googleOAuth2.Events, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'UserID' })
  GoogleOAuth2: GoogleOAuth2;
}
