import * as fs from 'fs';
import { jest } from '@jest/globals';
import { TypeOrmModule } from '@nestjs/typeorm';
import GoogleOAuth2 from './oauth2/google-oauth2.entity';
import MeetingRespondent from './meetings/meeting-respondent.entity';
import Meeting from './meetings/meeting.entity';
import MeetingsService from './meetings/meetings.service';
import User from './users/user.entity';
import UsersService from './users/users.service';

export function setJestTimeout(timeout = 10000) {
  jest.setTimeout(timeout);
}

export function setDatabaseName(name: string) {
  // TODO: allow testing other databases as well

  //const path = `./test-${name}.db`;
  //deleteDatabase(path);
  //process.env.SQLITE_PATH = path;
  process.env.SQLITE_PATH = ':memory:';
}

export function deleteDatabase(name: string) {
  const path = `./test-${name}.db`;
  for (const suffix of ['', '-shm', '-wal']) {
    if (fs.existsSync(path + suffix)) {
      fs.unlinkSync(path + suffix);
    }
  }
}

export function dynamicTypeOrmModule() {
  return TypeOrmModule.forFeature([
    GoogleOAuth2,
    Meeting,
    MeetingRespondent,
    User,
  ]);
}

export function createRegisteredUser(
  usersService: UsersService,
): Promise<User> {
  return usersService.create({
    Name: 'Bob',
    Email: 'a@b',
    PasswordHash:
      '$2b$11$oaQGacHcVL2CJYCwM4FEnOIeYmBkuvAOoDUUJj5W7A7Okb//vhYBm',
    IsSubscribedToNotifications: true,
  });
}

export function createMeeting(
  meetingsService: MeetingsService,
  partialMeeting: Partial<Meeting> = {},
): Promise<Meeting> {
  return meetingsService.createMeeting({
    Name: 'Some meeting',
    About: '',
    MinStartHour: 13,
    MaxEndHour: 21,
    TentativeDates: ['2022-10-27'],
    ...partialMeeting,
  });
}
