import { Entity, Column, PrimaryColumn, ManyToOne, Index } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import Meeting from '../meetings/meeting.entity';
import GoogleOAuth2 from './google-oauth2.entity';

@Entity('GoogleCalendarCreatedEvent')
export default class GoogleCalendarCreatedEvent {
  // Composite primary key (order matters - MeetingID must be first)
  @PrimaryColumn()
  MeetingID: number;

  @Index()
  @PrimaryColumn()
  UserID: number;

  // The ID of the Google Calendar event which we created for this meeting
  // once it was scheduled.
  @Column()
  CreatedGoogleMeetingID: string;

  @ManyToOne(() => Meeting, meeting => meeting.GoogleCalendarCreatedEvents, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'MeetingID'})
  Meeting: Meeting;

  @ManyToOne(() => GoogleOAuth2, googleOAuth2 => googleOAuth2.CreatedEvents, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'UserID'})
  GoogleOAuth2: GoogleOAuth2;
}
