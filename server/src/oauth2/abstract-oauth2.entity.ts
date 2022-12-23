import { Column, PrimaryColumn, Index } from 'typeorm';
import type { AbstractOAuth2CalendarCreatedEvent } from './oauth2-common';

export default abstract class AbstractOAuth2 {
  @PrimaryColumn()
  UserID: number;

  // If true, the credentials will be used for both OIDC and the Calendar API.
  // If false, the credentials will only be used for OIDC.
  @Column({ default: true })
  LinkedCalendar: boolean;

  // 'sub' claim in JWT
  @Index({ unique: true })
  @Column()
  Sub: string;

  @Column({ type: 'text' })
  AccessToken: string;

  // Unix epoch timestamp in seconds
  @Column()
  AccessTokenExpiresAt: number;

  @Column({ type: 'text' })
  RefreshToken: string;

  // Exact type depends on implementation
  CreatedEvents: AbstractOAuth2CalendarCreatedEvent[];

  static getColumnNames(): string[] {
    // Needed for building a raw SQL query
    return [
      'UserID', 'LinkedCalendar', 'Sub', 'AccessToken',
      'AccessTokenExpiresAt', 'RefreshToken',
    ];
  }
}
