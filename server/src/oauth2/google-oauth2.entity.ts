import { Entity, Column, PrimaryColumn, Index, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import User from '../users/user.entity';
import GoogleCalendarCreatedEvent from './google-calendar-created-event.entity';
import GoogleCalendarEvents from './google-calendar-events.entity';

// See https://developers.google.com/identity/openid-connect/openid-connect
@Entity('GoogleOAuth2')
export default class GoogleOAuth2 {
  @PrimaryColumn()
  UserID: number;

  // If true, the credentials will be used for both OIDC and the Calendar API.
  // If false, the credentials will only be used for OIDC.
  @Column({default: true})
  LinkedCalendar: boolean;

  // 'sub' claim in JWT
  @Index({unique: true})
  @Column()
  Sub: string;

  @Column()
  AccessToken: string;

  // Unix epoch timestamp in seconds
  @Column()
  AccessTokenExpiresAt: number;

  @Column()
  RefreshToken: string;

  @OneToOne(() => User, user => user.GoogleOAuth2, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'UserID'})
  User: User;

  @OneToMany(() => GoogleCalendarEvents, event => event.GoogleOAuth2)
  Events: GoogleCalendarEvents[];

  @OneToMany(() => GoogleCalendarCreatedEvent, event => event.GoogleOAuth2)
  CreatedEvents: GoogleCalendarCreatedEvent[];
}
