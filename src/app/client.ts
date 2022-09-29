import { nanoid } from '@reduxjs/toolkit';
import { range } from 'utils/arrays';
import { getDateString, addDaysToDateString, today } from 'utils/dates';
import { PeopleDateTimesFlat } from 'common/types';

export type ServerMeeting = {
  id: string,
  name: string,
  about: string,
  startTime: number,  // UTC time (warning: might be a decimal!)
  endTime: number,    // UTC time (warning: might be a decimal!)
  dates: string[],  // YYYY-MM-DD
  availabilities: PeopleDateTimesFlat,
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

export type SubmitAvailabilitiesResponse = {
  status: string,
};

export type LoginResponse = {
  name: string;
  userID: string;
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

class Client {
  createMeeting({
    name, about, dates, startTime, endTime,
  }: {
    name: string, about: string, dates: string[],
    startTime: number, endTime: number,
  }): Promise<ServerMeeting> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          id: nanoid(),
          name,
          about,
          dates,
          startTime,
          endTime,
          availabilities: {},
        });
      }, 1000);
    });
  }

  // TODO: store meeting ID in client when meeting info is fetched the first time
  getMeeting(id: string): Promise<ServerMeeting> {
    const d = new Date();
    const dateString1 = getDateString(d);
    const dateString2 = addDaysToDateString(dateString1, 1);
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          id,
          name: 'some-name',
          about: 'some-description',
          /*dates: [dateString1, dateString2],
          availabilities: {
            'bob': [
              ...['13:00', '13:30', '15:00', '16:00', '16:30'].map(t => `${dateString1}T${t}:00Z`),
              ...['18:00', '18:30', '20:30'].map(t => `${dateString2}T${t}:00Z`),
            ],
            'alice': [
              ...['13:30', '15:30', '16:30', '17:00'].map(t => `${dateString1}T${t}:00Z`),
            ],
          },
          startTime: 13,
          endTime: 21,*/
          dates: [dateString1].concat(
            ...range(9).map(i => addDaysToDateString(dateString1, 30+i))
          ),
          availabilities: {
            'bob': [`${dateString2}T02:00:00Z`, `${dateString2}T02:30:00Z`],
          },
          startTime: 23,
          endTime: 6,
        });
      }, 1000);
    });
  }

  submitAvailabilities(user: string, dateTimes: string[]): Promise<SubmitAvailabilitiesResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (false) {
          resolve({status: 'OK'});
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
