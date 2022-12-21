import { Entity, Column, PrimaryColumn, ManyToOne, Index } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import Meeting from '../meetings/meeting.entity';
import MicrosoftOAuth2 from './microsoft-oauth2.entity';
import type { OAuth2CalendarEvent } from './oauth2-common';

@Entity('MicrosoftCalendarEvents')
export default class MicrosoftCalendarEvents {
  @PrimaryColumn()
  MeetingID: number;

  @Index()
  @PrimaryColumn()
  UserID: number;

  @Column({ type: 'simple-json' })
  Events: OAuth2CalendarEvent[];

  // The startDateTime parameter used in the previous API request
  // See https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0
  @Column()
  PrevStartDateTime: string;

  // The endDateTime parameter used in the previous API request
  // See https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0
  @Column()
  PrevEndDateTime: string;

  // See https://learn.microsoft.com/en-us/graph/delta-query-events
  @Column({ type: 'text' })
  DeltaLink: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.MicrosoftCalendarEvents, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'MeetingID' })
  Meeting: Meeting;

  @ManyToOne(() => MicrosoftOAuth2, (msftOAuth2) => msftOAuth2.Events, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'UserID' })
  MicrosoftOAuth2: MicrosoftOAuth2;
}
