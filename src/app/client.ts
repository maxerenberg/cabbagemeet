import { nanoid } from "@reduxjs/toolkit";
import { getDateString } from "../features/daypicker/dateUtils";
import { DateTimes, PeopleDateTimes } from '../common/types';

export type ServerMeeting = {
  id: string,
  name: string,
  about: string,
  startTime: number,
  endTime: number,
  dates: string[],
  availabilities: PeopleDateTimes,
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
          dates: [dateString1, dateString2],
          availabilities: {
            'bob': {
              [dateString1]: [
                13, 13.5, 15, 16, 16.5,
              ],
              [dateString2]: [
                  18, 18.5, 20.5,
              ],
            },
            'alice': {
              [dateString1]: [
                13.5, 15.5, 16.5, 17,
              ],
            },
          },
          startTime: 13,
          endTime: 21,
        });
      }, 1000);
    });
  }
  submitAvailabilities(user: string, dateTimes: DateTimes): Promise<ServerSimpleResponse> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          status: 'OK',
        });
      }, 1000);
    });
  }
}

const client = new Client();
export default client;
