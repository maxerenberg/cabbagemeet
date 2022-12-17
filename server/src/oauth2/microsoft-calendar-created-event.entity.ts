import { Entity, Column, PrimaryColumn, ManyToOne, Index } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import Meeting from '../meetings/meeting.entity';
import MicrosoftOAuth2 from './microsoft-oauth2.entity';

@Entity('MicrosoftCalendarCreatedEvent')
export default class MicrosoftCalendarCreatedEvent {
  // Composite primary key (order matters - MeetingID must be first)
  @PrimaryColumn()
  MeetingID: number;

  @Index()
  @PrimaryColumn()
  UserID: number;

  // The ID of the Microsoft Calendar event which we created for this meeting
  // once it was scheduled.
  @Column()
  CreatedMicrosoftMeetingID: string;

  @ManyToOne(() => Meeting, meeting => meeting.MicrosoftCalendarCreatedEvents, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'MeetingID'})
  Meeting: Meeting;

  @ManyToOne(() => MicrosoftOAuth2, msftOAuth2 => msftOAuth2.CreatedEvents, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'UserID'})
  MicrosoftOAuth2: MicrosoftOAuth2;
}
