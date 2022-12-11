import { Column, PrimaryColumn, Index } from 'typeorm';

export default abstract class AbstractOAuth2 {
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

  @Column({type: 'text'})
  AccessToken: string;

  // Unix epoch timestamp in seconds
  @Column()
  AccessTokenExpiresAt: number;

  @Column({type: 'text'})
  RefreshToken: string;
}
