import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import client from '../../app/client';
import type { ServerMeeting } from '../../app/client';
import { addDaysToDateString, getUTCOffsetHours } from './dateUtils';
import type { DateTimes, PeopleDateTimes } from '../../common/types';

// can't import this from store.ts due to circular dependency
type RootState = {
  meetingTimes: MeetingTimesState,
};

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

type CreateMeetingInfo = {
  startTime: number,
  endTime: number,
  name: string,
  about: string,
};

type MeetingTimesState = {
  startTime: number | null,
  endTime: number | null,
  name: string | null,
  about: string | null,
  id: string | null,
  dates: string[],
  availabilities: PeopleDateTimes,
  fetchMeetingStatus: RequestStatus,
  createMeetingStatus: RequestStatus,
  submitAvailabilitiesStatus: RequestStatus,
  error: string | null,
};

const initialState: MeetingTimesState = {
  startTime: null,
  endTime: null,
  name: null,
  about: null,
  id: null,
  dates: [],
  availabilities: {},
  fetchMeetingStatus: 'idle',
  createMeetingStatus: 'idle',
  submitAvailabilitiesStatus: 'idle',
  error: null,
};

export const fetchMeeting = createAsyncThunk(
  'meetingTimes/fetchMeeting',
  async (id: string) => {
    const meeting = await client.getMeeting(id);
    return meeting;
  },
);

function addOffsetToDateTimes(
  { startTime, endTime, dates, availabilities }:
    { startTime: number, endTime: number, dates: string[], availabilities: PeopleDateTimes },
  offsetHours: number,
) {
  startTime += offsetHours;
  endTime += offsetHours;
  let dayOffset = 0;
  if (startTime < 0) {
    // Decrement each day by 1
    dayOffset = -1;
    startTime += 24;
  } else if (startTime >= 24) {
    // Increment each day by 1
    dayOffset = 1;
    startTime -= 24;
  }
  
  const newAvailabilities: PeopleDateTimes = {};
  for (const [person, dateTimes] of Object.entries(availabilities)) {
    const newDateTimes: DateTimes = {};
    for (const [date, times] of Object.entries(dateTimes)) {
      newDateTimes[addDaysToDateString(date, dayOffset)] = times;
    }
    newAvailabilities[person] = newDateTimes;
  }
  availabilities = newAvailabilities;
  dates = dates.map(date => addDaysToDateString(date, dayOffset));
    
  if (endTime < 0) endTime += 24;
  else if (endTime >= 24) endTime -= 24;

  for (const dateTimes of Object.values(availabilities)) {
    for (const [date, times] of Object.entries(dateTimes)) {
      dateTimes[date] = times.map(hour => {
        hour += offsetHours;
        if (hour < 0) return hour + 24;
        else if (hour >= 24) return hour - 24;
        return hour;
      });
    }
  }
  return { startTime, endTime, dates, availabilities };
}

export const createMeeting = createAsyncThunk<
  ServerMeeting,
  CreateMeetingInfo,
  { state: RootState }
>(
  'meetingTimes/createMeeting',
  async (payload, { getState } ) => {
    const {
      startTime: localStartTime,
      endTime: localEndTime,
      name,
      about,
    } = payload;
    const { dates: localDates, availabilities: localAvailabilities } = getState().meetingTimes;
    const { startTime, endTime, dates } = addOffsetToDateTimes(
      { startTime: localStartTime, endTime: localEndTime, dates: localDates,
        availabilities: localAvailabilities },
      -getUTCOffsetHours()
    );

    const meeting = await client.createMeeting({
      name,
      about,
      dates,
      startTime,
      endTime,
    });
    return meeting;
  },
);

function mergeSelectedDateTimes(selectedDateTimes: DateTimes, dateTimes: DateTimes): DateTimes {
  // If A and B are sets of datetimes, we want
  // (A - B) U (B - A)
  const newDateTimes: DateTimes = {};
  const getFirstMinusSecond = (first: DateTimes, second: DateTimes) => {
    for (const [date, times] of Object.entries(first)) {
      for (const time of times) {
        if (second[date]?.includes(time)) continue;
        if (!newDateTimes.hasOwnProperty(date)) {
          newDateTimes[date] = [];
        }
        newDateTimes[date].push(time);
      }
    }
  }
  getFirstMinusSecond(selectedDateTimes, dateTimes);
  getFirstMinusSecond(dateTimes, selectedDateTimes);
  return newDateTimes;
}

export const submitAvailabilities = createAsyncThunk<
  { user: string, dateTimes: DateTimes },
  { user: string, dateTimes: DateTimes },
  { state: RootState }
>(
  'meetingTimes/submitAvailabilities',
  async (payload, { getState }) => {
    let { user, dateTimes } = payload;
    const { startTime, endTime, availabilities } = getState().meetingTimes;
    if (startTime === null || endTime === null) {
      throw new Error("start and end times have not been set");
    }
    if (availabilities.hasOwnProperty(user)) {
      // submitting for an existing user
      dateTimes = mergeSelectedDateTimes(dateTimes, availabilities[user]);
    }
    const UTCDateTimes = addOffsetToDateTimes(
      { startTime, endTime, dates: [], availabilities: { [user]: dateTimes } },
      -getUTCOffsetHours()
    ).availabilities[user];
    await client.submitAvailabilities(user, UTCDateTimes);
    return { user, dateTimes };
  },
);

export const meetingTimesSlice = createSlice({
  name: 'meetingTimes',
  initialState,
  reducers: {
    addDay: (state, action) => {
      const dateString = action.payload;
      if (!state.dates.includes(dateString)) {
        state.dates.push(dateString);
        state.dates.sort();
      }
    },
    removeDay: (state, action) => {
      const dateString = action.payload;
      return {
        ...state,
        dates: state.dates.filter(d => d !== dateString),
      };
    },
    resetCreateMeetingStatus: (state) => {
      state.createMeetingStatus = 'idle';
    },
    resetSubmitAvailabilitiesStatus: (state) => {
      state.submitAvailabilitiesStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
    .addCase(fetchMeeting.pending, (state) => {
      state.fetchMeetingStatus = 'loading';
    })
    .addCase(fetchMeeting.fulfilled, (state, action) => {
      const {
        startTime: UTCStartTime,
        endTime: UTCEndTime,
        dates: UTCDates,
        availabilities: UTCAvailabilities,
        name,
        about,
        id,
      } = action.payload;
      const {startTime, endTime, dates} = addOffsetToDateTimes(
        { startTime: UTCStartTime, endTime: UTCEndTime, dates: UTCDates,
          availabilities: UTCAvailabilities },
        getUTCOffsetHours(),
      );
      return {
        ...state,
        startTime,
        endTime,
        dates,
        name,
        about,
        id,
        fetchMeetingStatus: 'succeeded',
      };
    })
    .addCase(fetchMeeting.rejected, (state, action) => {
      state.fetchMeetingStatus = 'failed';
      state.error = action.error.message || null;
    })
    .addCase(createMeeting.pending, (state) => {
      state.createMeetingStatus = 'loading';
    })
    .addCase(createMeeting.fulfilled, (state, action) => {
      const {
        startTime: UTCStartTime,
        endTime: UTCEndTime,
        dates: UTCDates,
        availabilities: UTCAvailabilities,
        name,
        about,
        id,
      } = action.payload;
      const {startTime, endTime, dates} = addOffsetToDateTimes(
        { startTime: UTCStartTime, endTime: UTCEndTime, dates: UTCDates,
          availabilities: UTCAvailabilities },
        getUTCOffsetHours(),
      );
      return {
        ...state,
        startTime,
        endTime,
        dates,
        name,
        about,
        id,
        createMeetingStatus: 'succeeded',
      };
    })
    .addCase(createMeeting.rejected, (state, action) => {
      state.createMeetingStatus = 'failed';
      state.error = action.error.message || null;
    })
    .addCase(submitAvailabilities.fulfilled, (state, action) => {
      const { user, dateTimes } = action.payload;
      state.availabilities[user] = dateTimes;
      state.submitAvailabilitiesStatus = 'succeeded';
    })
    .addCase(submitAvailabilities.pending, (state) => {
      state.submitAvailabilitiesStatus = 'loading';
    })
    .addCase(submitAvailabilities.rejected, (state, action) => {
      state.submitAvailabilitiesStatus = 'failed';
      state.error = action.error.message || null;
    })
    ;
  }
});

export const {
  addDay,
  removeDay,
  resetCreateMeetingStatus,
  resetSubmitAvailabilitiesStatus,
} = meetingTimesSlice.actions;

export default meetingTimesSlice.reducer;
