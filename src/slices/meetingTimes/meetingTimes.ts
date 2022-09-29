import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import client from 'app/client';
import type { ServerMeeting } from 'app/client';
import type { RootState } from 'app/store';
import type { PeopleDateTimes, RequestStatus, DateTimeSet } from 'common/types';
import { selectSelectedDates } from 'slices/selectedDates';
import { arrayToObject } from 'utils/arrays';
import { addOffsetToDateTimes, addMinutesToDateTimeString, UTCOffsetHours } from 'utils/dates';
import { PeopleDateTimesFlatToPeopleDateTimes } from './meetingTimes.helpers';

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
  startTime: number | null,  // Local time (warning: can be a decimal!)
  endTime: number | null,    // Local time (warning: can be a decimal!)
  name: string | null,
  about: string | null,
  id: string | null,
  dates: string[],  // must be sorted at all times
  availabilities: PeopleDateTimes,
  scheduledDateTimes?: DateTimeSet,
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
      -UTCOffsetHours
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
    setScheduledDateTimes: (state, { payload }: PayloadAction<DateTimeSet>) => {
      state.scheduledDateTimes = payload;
    },
    unsetScheduledDateTimes: (state) => {
      state.scheduledDateTimes = undefined;
    },
    reset: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeeting.pending, (state) => {
        state.fetchMeetingStatus = 'loading';
      })
      .addCase(fetchMeeting.fulfilled, (state, { payload }) => {
        const {
          startTime: UTCStartTime,
          endTime: UTCEndTime,
          dates: UTCDates,
          availabilities: availabilitiesFlat,
          name,
          about,
          id,
        } = payload;
        let scheduledDateTimes: DateTimeSet | undefined;
        if (payload.scheduledStartTime && payload.scheduledEndTime) {
          let scheduledDateTimesFlat = [];
          let dateTime = payload.scheduledStartTime;
          while (dateTime !== payload.scheduledEndTime) {
            if (scheduledDateTimesFlat.length >= 24) {
              // sanity check just in case the server screws up...
              console.error('Invalid scheduled times from server:', payload.scheduledStartTime, payload.scheduledEndTime);
              break;
            }
            scheduledDateTimesFlat.push(dateTime);
            dateTime = addMinutesToDateTimeString(dateTime, 30);
          }
          if (0 <= scheduledDateTimesFlat.length && scheduledDateTimesFlat.length < 24) {
            scheduledDateTimes = arrayToObject(scheduledDateTimesFlat);
          }
        }
        const {startTime, endTime, dates} = addOffsetToDateTimes(
          { startTime: UTCStartTime, endTime: UTCEndTime, dates: UTCDates },
          UTCOffsetHours,
        );
        const availabilities = PeopleDateTimesFlatToPeopleDateTimes(availabilitiesFlat);
        dates.sort();
        return {
          ...state,
          startTime,
          endTime,
          dates,
          availabilities,
          scheduledDateTimes,
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
        // TODO: there's no need to convert back from UTC again. Just use action.meta.arg
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
          UTCOffsetHours,
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
  setScheduledDateTimes,
  unsetScheduledDateTimes,
  reset: resetMeetingInfo,
} = meetingTimesSlice.actions;

export const selectScheduledDateTimes = (state: RootState) => state.meetingTimes.scheduledDateTimes || {};
export const selectMeetingIsScheduled = (state: RootState) => state.meetingTimes.scheduledDateTimes !== undefined;

export default meetingTimesSlice.reducer;
