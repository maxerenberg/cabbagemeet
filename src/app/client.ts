import { nanoid } from '@reduxjs/toolkit';
import { range } from 'utils/arrays';
import { getDateString, addDaysToDateString } from 'utils/dates';
import { PeopleDateTimesFlat } from 'common/types';

export type ServerMeeting = {
  id: string,
  name: string,
  about: string,
  startTime: number,
  endTime: number,
  dates: string[],
  availabilities: PeopleDateTimesFlat,
};

export type SubmitAvailabilitiesResponse = {
  status: string,
};

export type LoginResponse = {
  name: string;
  userID: string;
};

export type SignupResponse = LoginResponse;

export type ResetPasswordResponse = {
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
        if (true) {
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

  static numPasswordResets = 0;

  resetPassword(email: string): Promise<ResetPasswordResponse> {
    Client.numPasswordResets += 1;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Client.numPasswordResets === 1) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }
}

const client = new Client();
export default client;
