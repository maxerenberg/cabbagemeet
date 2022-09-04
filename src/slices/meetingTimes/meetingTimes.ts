import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import client from 'app/client';
import type { ServerMeeting } from 'app/client';
import { selectSelectedDates } from 'slices/selectedDates';
import { getUTCOffsetHours } from 'utils/dates';
import type { PeopleDateTimes, RequestStatus, DateTimeSet } from 'common/types';
import type { RootState } from 'app/store';
import { addOffsetToDateTimes, PeopleDateTimesFlatToPeopleDateTimes } from './meetingTimes.helpers';

// All dates and times are stored in local time, except for the DateTime strings
// which are stored in UTC.
// We need to convert to UTC when sending/receiving data to/from the server.

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
  dates: string[],  // must be sorted at all times
  availabilities: PeopleDateTimes,
  fetchMeetingStatus: RequestStatus,
  createMeetingStatus: RequestStatus,
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
  error: null,
};

export const fetchMeeting = createAsyncThunk(
  'meetingTimes/fetchMeeting',
  async (id: string) => {
    const meeting = await client.getMeeting(id);
    return meeting;
  },
);

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
    const localDates = Object.keys(selectSelectedDates(getState()));
    const { startTime, endTime, dates } = addOffsetToDateTimes(
      {
        startTime: localStartTime,
        endTime: localEndTime,
        dates: localDates,
      },
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

export const meetingTimesSlice = createSlice({
  name: 'meetingTimes',
  initialState,
  reducers: {
    addDay: (state, action: PayloadAction<string>) => {
      const dateString = action.payload;
      if (!state.dates.includes(dateString)) {
        state.dates.push(dateString);
        state.dates.sort();
      }
    },
    removeDay: (state, action: PayloadAction<string>) => {
      const dateString = action.payload;
      return {
        ...state,
        dates: state.dates.filter(d => d !== dateString),
      };
    },
    setUserAvailabilities: (state, action: PayloadAction<{user: string, dateTimes: DateTimeSet}>) => {
      const {user, dateTimes} = action.payload;
      state.availabilities[user] = dateTimes;
    },
    resetCreateMeetingStatus: (state) => {
      state.createMeetingStatus = 'idle';
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
          availabilities: availabilitiesFlat,
          name,
          about,
          id,
        } = action.payload;
        const {startTime, endTime, dates} = addOffsetToDateTimes(
          { startTime: UTCStartTime, endTime: UTCEndTime, dates: UTCDates },
          getUTCOffsetHours(),
        );
        const availabilities = PeopleDateTimesFlatToPeopleDateTimes(availabilitiesFlat);
        dates.sort();
        return {
          ...state,
          startTime,
          endTime,
          dates,
          availabilities,
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
          availabilities: availabilitiesFlat,
          name,
          about,
          id,
        } = action.payload;
        const {startTime, endTime, dates} = addOffsetToDateTimes(
          { startTime: UTCStartTime, endTime: UTCEndTime, dates: UTCDates },
          getUTCOffsetHours(),
        );
        const availabilities = PeopleDateTimesFlatToPeopleDateTimes(availabilitiesFlat);
        dates.sort();
        return {
          ...state,
          startTime,
          endTime,
          dates,
          availabilities,
          name,
          about,
          id,
          createMeetingStatus: 'succeeded',
        };
      })
      .addCase(createMeeting.rejected, (state, action) => {
        state.createMeetingStatus = 'failed';
        state.error = action.error.message || null;
      });
  }
});

export const {
  addDay,
  removeDay,
  setUserAvailabilities,
  resetCreateMeetingStatus,
} = meetingTimesSlice.actions;

export default meetingTimesSlice.reducer;
