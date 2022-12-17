import { Entity, ManyToOne, OneToMany } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import User from '../users/user.entity';
import AbstractOAuth2 from './abstract-oauth2.entity';
import MicrosoftCalendarEvents from './microsoft-calendar-events.entity';
import MicrosoftCalendarCreatedEvent from './microsoft-calendar-created-event.entity';

// See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc
@Entity('MicrosoftOAuth2')
export default class MicrosoftOAuth2 extends AbstractOAuth2 {
  // !!!!!!!!!!!!!!
  // Workaround for https://github.com/typeorm/typeorm/issues/3952
  // !!!!!!!!!!!!!!

  //@OneToOne(() => User, user => user.MicrosoftOAuth2, {onDelete: 'CASCADE'})
  @ManyToOne(() => User, user => user.MicrosoftOAuth2, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'UserID'})
  User: User;

  @OneToMany(() => MicrosoftCalendarEvents, event => event.MicrosoftOAuth2)
  Events: MicrosoftCalendarEvents[];

  @OneToMany(() => MicrosoftCalendarCreatedEvent, event => event.MicrosoftOAuth2)
  CreatedEvents: MicrosoftCalendarCreatedEvent[];
}
