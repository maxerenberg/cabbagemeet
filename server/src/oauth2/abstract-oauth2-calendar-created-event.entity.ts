import { Column, Index, PrimaryColumn } from 'typeorm';

export default abstract class AbstractOAuth2CalendarCreatedEvent {
  @PrimaryColumn()
  RespondentID: number;

  @Index()
  @Column()
  UserID: number;

  // The ID of the external OAuth2 calendar event which we created for
  // this meeting once it was scheduled.
  @Column()
  CreatedEventID: string;
}
