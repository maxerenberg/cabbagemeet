import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import User from '../users/user.entity';
import Meeting from './meeting.entity';

@Entity('MeetingRespondent')
// Composite partial index
@Index(['MeetingID', 'UserID'], { unique: true, where: 'UserID IS NOT NULL' })
export default class MeetingRespondent {
  @PrimaryGeneratedColumn()
  RespondentID: number;

  @Index()
  @Column()
  MeetingID: number;

  @ManyToOne(() => Meeting, meeting => meeting.Respondents, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'MeetingID'})
  Meeting: Meeting;

  @Index({where: 'UserID IS NOT NULL'})
  @Column({nullable: true})
  UserID?: number;

  @ManyToOne(() => User, user => user.Respondents, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'UserID'})
  User?: User;

  @Column({nullable: true})
  GuestName?: string;

  @Column({nullable: true})
  GuestEmail?: string;

  // This is a JSON array of the start times of the 30-minute intervals
  // during which the respondent is available (UTC).
  // e.g. '["2022-10-23T10:00:00Z", "2022-10-23T10:30:00Z"]'
  @Column()
  Availabilities: string;
}
