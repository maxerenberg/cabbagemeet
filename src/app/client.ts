import { nanoid } from '@reduxjs/toolkit';
import { range } from 'utils/arrays';
import { getDateString, addDaysToDateString, today } from 'utils/dates';
import { assert } from 'utils/misc';
import type { PeopleDateTimesFlat, PeopleInfo } from 'common/types';

export type UserInfo = {
  userID: string;
  name: string;
  hasLinkedGoogleAccount: boolean;
  isSubscribedToNotifications: boolean;
};

export type GetSelfInfoResponse = UserInfo | null;

export type ExternalCalendarEvent = {
  name: string;
  startDateTime: string;
  endDateTime: string;
};

export type ServerMeeting = {
  id: string,
  name: string,
  about: string,
  startTime: number,  // UTC time (warning: might be a decimal!)
  endTime: number,    // UTC time (warning: might be a decimal!)
  dates: string[],  // YYYY-MM-DD
  // The keys of availabilities and people must be exactly the same.
  availabilities: PeopleDateTimesFlat,
  people: PeopleInfo,
  scheduledStartTime?: string,  // YYYY-MM-DDTHH:MM:ssZ
  scheduledEndTime?: string,    // YYYY-MM-DDTHH:MM:ssZ
  googleCalendarEvents?: ExternalCalendarEvent[],
};

export type ServerMeetingShort = {
  id: string,
  name: string,
  // If the meeting has been scheduled, startTime and endTime are the scheduled
  // meeting start/end times; otherwise, they are the eligible start/end times
  // between which the meeting may be scheduled (which the meeting creator chose).
  startTime: number,  // UTC time (warning: might be a decimal!)
  endTime: number,    // UTC time (warning: might be a decimal!)
  // Dates will only be present if the meeting was NOT scheduled
  dates?: string[],  // YYYY-MM-DD
  scheduledDay?: string;  // YYYY-MM-DD
};

export type SubmitAvailabilitiesArgs = {
  dateTimes: string[];
  otherUserID?: string;
  guestName?: string;
  guestEmail?: string;
};

export type SubmitAvailabilitiesResponse = {
  status: 'OK',
  availabilities: PeopleDateTimesFlat,
  people: PeopleInfo,
};

export type LoginResponse = UserInfo;

export type SignupResponse = UserInfo;

export type LogoutResponse = {
  status: 'OK';
};

export type ResetPasswordResponse = {
  status: 'OK';
};

export type SubmitScheduleResponse = {
  status: 'OK';
};

export type SubmitUnscheduleResponse = {
  status: 'OK';
};

export type EditMeetingArgs = {
  id: string;
  name: string;
  about: string;
  dates: string[];
  startTime: number;
  endTime: number;
};

export type EditMeetingResponse = {
  status: 'OK';
};

export type DeleteMeetingResponse = {
  status: 'OK';
};

export type EditNameResponse = { status: 'OK' };
export type SubscribeToNotificationsResponse = { status: 'OK' };
export type DeleteAccountResponse = { status: 'OK' };
export type UnlinkGoogleCalendarResponse = { status: 'OK' };

const dateString1 = getDateString(today);
const dateString2 = addDaysToDateString(dateString1, 1);
const peopleDB: PeopleInfo = {
  'bob123': {name: 'Bob'},
  'alice123': {name: 'Alice'}
};
const sampleMeeting: ServerMeeting = {
  id: nanoid(),
  name: 'some-name',
  about: 'some-description',
  dates: [dateString1].concat(
    ...range(9).map(i => addDaysToDateString(dateString1, 30+i))
  ),
  availabilities: {
    'alice123': [`${dateString2}T02:00:00Z`, `${dateString2}T02:30:00Z`],
  },
  googleCalendarEvents: [
    {
      name: 'Event 1',
      startDateTime: `${dateString2}T01:30:00Z`,
      endDateTime: `${dateString2}T02:30:00Z`,
    },
  ],
  people: {
    'alice123': peopleDB['alice123'],
  },
  startTime: 23.5,
  endTime: 6,
  scheduledStartTime: `${dateString2}T02:30:00Z`,
  scheduledEndTime: `${dateString2}T03:30:00Z`,
};

class Client {
  meeting: ServerMeeting | null;
  // FIXME: actually, this is a bad idea.
  userID: string | null;

  constructor() {
    this.meeting = null;
    this.userID = null;
  }

  createMeeting({
    name, about, dates, startTime, endTime,
  }: {
    name: string, about: string, dates: string[],
    startTime: number, endTime: number,
  }): Promise<ServerMeeting> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.meeting = {
          id: nanoid(),
          name,
          about,
          dates,
          startTime,
          endTime,
          people: {},
          availabilities: {},
        };
        resolve(this.meeting);
      }, 1000);
    });
  }

  editMeeting(
    {id, name, about, dates, startTime, endTime}: EditMeetingArgs
  ): Promise<EditMeetingResponse> {
    return new Promise(resolve => {
      setTimeout(() => {
        assert(this.meeting !== null);
        this.meeting.name = name;
        this.meeting.about = about;
        this.meeting.dates = dates;
        this.meeting.startTime = startTime;
        this.meeting.endTime = endTime;
        resolve({status: 'OK'});
      }, 1000);
    });
  }

  deleteMeeting(id: string): Promise<DeleteMeetingResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  // TODO: store meeting ID in client when meeting info is fetched the first time
  getMeeting(id: string): Promise<ServerMeeting> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.meeting = {
          ...sampleMeeting,
          id,
        }
        resolve(this.meeting);
      }, 1000);
    });
  }

  submitAvailabilities({dateTimes, otherUserID = undefined, guestName = undefined}: SubmitAvailabilitiesArgs): Promise<SubmitAvailabilitiesResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        assert(this.meeting !== null);
        if (true) {
          let userID: string | undefined;
          if (guestName !== undefined) {
            userID = nanoid();
            peopleDB[userID] = {name: guestName};
          } else if (otherUserID !== undefined) {
            userID = otherUserID;
          } else {
            assert(this.userID !== null);
            userID = this.userID;
          }
          // Somewhere, either React or the Typescript compiler is calling
          // Object.preventExtensions on this.meeting.people, so trying to mutate
          // it produces the error "Object is not extensible".
          // So we'll just create a new object instead.
          this.meeting.people = {
            ...this.meeting.people,
            [userID]: peopleDB[userID],
          }
          this.meeting.availabilities[userID] = dateTimes;
          resolve({
            status: 'OK',
            availabilities: this.meeting.availabilities,
            people: this.meeting.people,
          });
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  getSelfInfo(): Promise<GetSelfInfoResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (false) {
          this.userID = 'bob123';
          resolve({
            name: 'John Smith',
            userID: this.userID!,
            hasLinkedGoogleAccount: true,
            isSubscribedToNotifications: true,
          });
        } else if (true) {
          resolve(null);
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  signup(name: string, email: string, password: string): Promise<SignupResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({
            name: 'John Smith',
            userID: nanoid(),
            hasLinkedGoogleAccount: false,
            isSubscribedToNotifications: true,
          });
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  login(email: string, password: string): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({
            name: 'John Smith',
            userID: nanoid(),
            hasLinkedGoogleAccount: false,
            isSubscribedToNotifications: true,
          });
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  logout(): Promise<LogoutResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  resetPassword(email: string): Promise<ResetPasswordResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  editName(newName: string): Promise<EditNameResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  subscribeToNotifications(subscribe: boolean): Promise<SubscribeToNotificationsResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  unlinkGoogleCalendar(): Promise<UnlinkGoogleCalendarResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  deleteAccount(): Promise<DeleteAccountResponse> {
    // TODO: clear the saved userID
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  /**
   * Submits a scheduled time for the meeting.
   * @param startDateTime The time when the meeting starts. Must be in UTC.
   * @param endDateTime The time when the meeting ends. Must be in UTC.
   * @returns The server response
   */
  submitSchedule(startDateTime: string, endDateTime: string): Promise<SubmitScheduleResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  submitUnschedule(): Promise<SubmitUnscheduleResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  // TODO: support pagination
  getCreatedMeetings(): Promise<ServerMeetingShort[]> {
    const todayString = getDateString(today);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve([
            {
              id: '1',
              name: 'Meeting 1',
              startTime: 13.5,
              endTime: 14,
              scheduledDay: todayString,
            },
            {
              id: '2',
              name: 'Meeting 2',
              startTime: 13.5,
              endTime: 14,
              dates: [todayString, addDaysToDateString(todayString, 1)],
            },
            {
              id: '3',
              name: 'Meeting 3',
              startTime: 13.5,
              endTime: 14,
              dates: [todayString, addDaysToDateString(todayString, 1), addDaysToDateString(todayString, 3)],
            },
          ]);
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }

  // TODO: support pagination
  getRespondedMeetings(): Promise<ServerMeetingShort[]> {
    const todayString = getDateString(today);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve([
            {
              id: '4',
              name: 'Meeting 5',
              startTime: 2,
              endTime: 2.5,
              dates: [todayString, addDaysToDateString(todayString, 3)],
            },
            {
              id: '5',
              name: 'Meeting 5',
              startTime: 13.5,
              endTime: 14,
              scheduledDay: addDaysToDateString(todayString, 2),
            },
          ]);
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }
}

const client = new Client();
export default client;
