import { Entity, ManyToOne } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import MeetingRespondent from '../meetings/meeting-respondent.entity';
import AbstractOAuth2CalendarCreatedEvent from './abstract-oauth2-calendar-created-event.entity';
import MicrosoftOAuth2 from './microsoft-oauth2.entity';

@Entity('MicrosoftCalendarCreatedEvent')
export default class MicrosoftCalendarCreatedEvent extends AbstractOAuth2CalendarCreatedEvent {
  // No cascading deletion so that we can delete events which we created
  @ManyToOne(() => MeetingRespondent, (respondent) => respondent.MicrosoftCalendarCreatedEvents, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'RespondentID' })
  MeetingRespondent: MeetingRespondent;

  @ManyToOne(() => MicrosoftOAuth2, (msftOAuth2) => msftOAuth2.CreatedEvents, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'UserID' })
  MicrosoftOAuth2: MicrosoftOAuth2;
}
