import { nanoid } from '@reduxjs/toolkit';
import { range } from 'utils/arrays';
import { getDateString, addDaysToDateString, today } from 'utils/dates';
import type { PeopleDateTimesFlat, PeopleInfo } from 'common/types';

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
  dateTimes: string[],
} & ({
  userID: string;  // for submitting another user, or for submitting oneself when logged in
} | {
  name: string;  // for submitting oneself and NOT logged in
});

export type SubmitAvailabilitiesResponse = {
  status: 'OK',
  availabilities: PeopleDateTimesFlat,
  people: PeopleInfo,
};

export type LoginResponse = {
  name: string;
  userID: string;
  isSubscribedToNotifications: boolean;
};

export type SignupResponse = LoginResponse;

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

function isSubmittingAsGuest(args: SubmitAvailabilitiesArgs): args is {
  dateTimes: string[];
  name: string;
} {
  return !args.hasOwnProperty('userID');
};

const dateString1 = getDateString(today);
const dateString2 = addDaysToDateString(dateString1, 1);
const meeting: ServerMeeting = {
  id: nanoid(),
  name: 'some-name',
  about: 'some-description',
  dates: [dateString1].concat(
    ...range(9).map(i => addDaysToDateString(dateString1, 30+i))
  ),
  availabilities: {
    'bob123': [`${dateString2}T02:00:00Z`, `${dateString2}T02:30:00Z`],
  },
  people: {
    'bob123': {name: 'Bob'},
  },
  // TODO: test fractional time
  startTime: 23.5,
  endTime: 6,
  scheduledStartTime: `${dateString2}T03:30:00Z`,
  scheduledEndTime: `${dateString2}T04:30:00Z`,
};

class Client {
  createMeeting({
    name, about, dates, startTime, endTime,
  }: {
    name: string, about: string, dates: string[],
    startTime: number, endTime: number,
  }): Promise<ServerMeeting> {
    return new Promise(resolve => {
      setTimeout(() => {
        meeting.name = name;
        meeting.about = about;
        meeting.dates = dates;
        meeting.startTime = startTime;
        meeting.endTime = endTime;
        meeting.people = {};
        meeting.availabilities = {};
        resolve(meeting);
      }, 1000);
    });
  }

  editMeeting(
    {id, name, about, dates, startTime, endTime}: EditMeetingArgs
  ): Promise<EditMeetingResponse> {
    return new Promise(resolve => {
      setTimeout(() => {
        meeting.name = name;
        meeting.about = about;
        meeting.dates = dates;
        meeting.startTime = startTime;
        meeting.endTime = endTime;
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
        meeting.id = id;
        resolve(meeting);
      }, 1000);
    });
  }

  submitAvailabilities(args: SubmitAvailabilitiesArgs): Promise<SubmitAvailabilitiesResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          let userID: string | undefined;
          if (isSubmittingAsGuest(args)) {
            userID = nanoid();
            meeting.people[userID] = {name: args.name};
          } else {
            userID = args.userID;
          }
          meeting.availabilities[userID] = args.dateTimes;
          resolve({
            status: 'OK',
            availabilities: meeting.availabilities,
            people: meeting.people,
          });
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
