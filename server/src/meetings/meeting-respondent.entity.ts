import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import User from '../users/user.entity';
import Meeting from './meeting.entity';

@Entity('MeetingRespondent')
// Null values are distinct in UNIQUE indices for Postgres, MySQL and SQLite.
// We omit the "WHERE UserID IS NOT NULL" clause here so that we can re-use
// this composite index when searching on MeetingID, which means that we
// don't need to create a separate index on the MeetingID column.
// Also see https://www.sqlite.org/nulls.html.
@Index(['MeetingID', 'UserID'], { unique: true })
export default class MeetingRespondent {
  @PrimaryGeneratedColumn()
  RespondentID: number;

  @Column()
  MeetingID: number;

  @ManyToOne(() => Meeting, (meeting) => meeting.Respondents, {
    onDelete: 'CASCADE',
  })
  @CustomJoinColumn({ name: 'MeetingID' })
  Meeting: Meeting;

  @Index({ where: 'UserID IS NOT NULL' })
  @Column({ nullable: true })
  UserID?: number;

  @ManyToOne(() => User, (user) => user.Respondents, { onDelete: 'CASCADE' })
  @CustomJoinColumn({ name: 'UserID' })
  User?: User;

  @Column({ nullable: true })
  GuestName?: string;

  @Column({ nullable: true })
  GuestEmail?: string;

  // This is a JSON array of the start times of the 30-minute intervals
  // during which the respondent is available (UTC).
  // e.g. '["2022-10-23T10:00:00Z", "2022-10-23T10:30:00Z"]'
  @Column()
  Availabilities: string;
}
