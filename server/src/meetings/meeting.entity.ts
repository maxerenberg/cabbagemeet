import User from '../users/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, ManyToOne, JoinColumn } from 'typeorm';
import MeetingRespondent from './meeting-respondent.entity';
import GoogleCalendarEvents from '../oauth2/google-calendar-events.entity';
import GoogleCalendarCreatedEvent from '../oauth2/google-calendar-created-event.entity';

@Entity('Meeting')
export default class Meeting {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column()
  Name: string;

  @Column()
  About: string;

  @Column('decimal', { precision: 4, scale: 2 })
  MinStartHour: number;

  @Column('decimal', { precision: 4, scale: 2 })
  MaxEndHour: number;

  // JSON array
  // e.g. '["2022-10-23", "2022-10-24"]'
  @Column()
  TentativeDates: string;

  // e.g. '2022-10-23T10:00:00Z'
  @Column({nullable: true})
  ScheduledStartDateTime?: string;

  // e.g. '2022-10-23T10:30:00Z'
  @Column({nullable: true})
  ScheduledEndDateTime?: string;

  @OneToMany(() => MeetingRespondent, (respondent) => respondent.Meeting)
  Respondents: MeetingRespondent[];

  // Will be null if meeting was created by an anonymous user
  @Index({where: 'CreatorID IS NOT NULL'})
  @Column({nullable: true})
  CreatorID?: number;

  @ManyToOne(() => User, (user) => user.CreatedMeetings, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'CreatorID'})
  Creator?: User;

  @OneToMany(() => GoogleCalendarEvents, googleEvent => googleEvent.Meeting)
  GoogleCalendarEvents: GoogleCalendarEvents[];

  @OneToMany(() => GoogleCalendarCreatedEvent, googleEvent => googleEvent.Meeting)
  GoogleCalendarCreatedEvents: GoogleCalendarCreatedEvent[];
};
