import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import GoogleOAuth2 from '../oauth2/google-oauth2.entity';
import MicrosoftOAuth2 from '../oauth2/microsoft-oauth2.entity';
import MeetingRespondent from '../meetings/meeting-respondent.entity';
import Meeting from '../meetings/meeting.entity';

@Entity('User')
export default class User {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column({ nullable: true })
  PasswordHash?: string;

  // Seconds since Unix epoch
  // If a token's 'iat' value is less than this number, then the token
  // is invalid
  @Column({ nullable: true })
  TimestampOfEarliestValidToken: number;

  @Column()
  Name: string;

  @Index({ unique: true })
  @Column()
  Email: string;

  @Column({ default: false })
  IsSubscribedToNotifications: boolean;

  @OneToMany(() => MeetingRespondent, (respondent) => respondent.User)
  Respondents: MeetingRespondent[];

  @OneToMany(() => Meeting, (meeting) => meeting.Creator)
  CreatedMeetings: Meeting[];

  @OneToOne(() => GoogleOAuth2, (googleUser) => googleUser.User)
  GoogleOAuth2?: GoogleOAuth2;

  @OneToOne(() => MicrosoftOAuth2, (msftUser) => msftUser.User)
  MicrosoftOAuth2?: MicrosoftOAuth2;
}
