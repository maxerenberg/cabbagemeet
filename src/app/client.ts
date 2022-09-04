import { nanoid } from '@reduxjs/toolkit';
import { getDateString } from 'utils/dates';
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

export type ServerSimpleResponse = {
  status: string,
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
    d.setDate(d.getDate() + 1);
    const dateString2 = getDateString(d);
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
          dates: [dateString1],
          availabilities: {
            'bob': [`${dateString2}T02:00:00Z`, `${dateString2}T02:30:00Z`],
          },
          startTime: 23,
          endTime: 6,
        });
      }, 1000);
    });
  }
  submitAvailabilities(user: string, dateTimes: string[]): Promise<ServerSimpleResponse> {
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
}

const client = new Client();
export default client;
