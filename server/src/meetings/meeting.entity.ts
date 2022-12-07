import User from '../users/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, ManyToOne } from 'typeorm';
import { CustomJoinColumn } from '../custom-columns/custom-join-column';
import MeetingRespondent from './meeting-respondent.entity';
import GoogleCalendarEvents from '../oauth2/google-calendar-events.entity';
import GoogleCalendarCreatedEvent from '../oauth2/google-calendar-created-event.entity';

/*
It is necessary to store the timezone of the person who created
a meeting because timezone offsets (e.g. -04:00) for a given location
can change due to Daylight Savings Time.
If the client simply assumed that the minStartHour and maxEndHour values
are in UTC, they would calculate incorrect times for date ranges which
overlap with DST changes.
For example, let's say I want a meeting to be between 09:00 and 17:00
in Toronto on Nov. 5th or Nov. 6th. DST ends on Nov. 6th. Assuming that
the meeting was created on or before Nov. 5th, these times would be stored
on the server as 13:00 and 21:00 in UTC. If the client only saw these times,
then they would calculate the meeting times to be 09:00 to 17:00 on
Nov. 5th (EDT) and 08:00 to 16:00 on Nov. 6th (EST). But that would be wrong.
*/

// The decimal columns come back as strings for MariaDB
const decimalTransformer = {
  from: (s: string | number) => +s,
  to: (x: number) => x,
};

@Entity('Meeting')
export default class Meeting {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column()
  Name: string;

  @Column()
  About: string;

  // Must be an IANA tz database name, e.g. "America/Toronto"
  @Column()
  Timezone: string;

  // Must be a multiple of 0.25 and be between [0, 24)
  @Column('decimal', { precision: 4, scale: 2, transformer: decimalTransformer })
  MinStartHour: number;

  // Must be a multiple of 0.25 and be between [0, 24)
  @Column('decimal', { precision: 4, scale: 2, transformer: decimalTransformer })
  MaxEndHour: number;

  // JSON array
  // e.g. '["2022-10-23", "2022-10-24"]'
  @Column({type: 'simple-json'})
  TentativeDates: string[];

  // e.g. '2022-10-23T10:00:00Z'
  @Column({nullable: true})
  ScheduledStartDateTime?: string;

  // e.g. '2022-10-23T10:30:00Z'
  @Column({nullable: true})
  ScheduledEndDateTime?: string;

  // This is used to avoid sending redundant email notifications when
  // a meeting is rescheduled
  @Column({default: false})
  WasScheduledAtLeastOnce: boolean;

  @OneToMany(() => MeetingRespondent, (respondent) => respondent.Meeting)
  Respondents: MeetingRespondent[];

  // Will be null if meeting was created by an anonymous user
  @Index({where: 'CreatorID IS NOT NULL'})
  @Column({nullable: true})
  CreatorID?: number;

  @ManyToOne(() => User, (user) => user.CreatedMeetings, {onDelete: 'CASCADE'})
  @CustomJoinColumn({name: 'CreatorID'})
  Creator?: User;

  @OneToMany(() => GoogleCalendarEvents, googleEvent => googleEvent.Meeting)
  GoogleCalendarEvents: GoogleCalendarEvents[];

  @OneToMany(() => GoogleCalendarCreatedEvent, googleEvent => googleEvent.Meeting)
  GoogleCalendarCreatedEvents: GoogleCalendarCreatedEvent[];
};
