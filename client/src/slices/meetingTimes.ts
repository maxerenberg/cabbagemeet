import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import client from 'app/client';
import type {
  ServerMeeting,
  EditMeetingArgs,
  EditMeetingResponse,
} from 'app/client';
import type { RootState, AppThunk } from 'app/store';
import type { PeopleDateTimes, RequestStatus, DateTimeSet, PeopleInfo, PeopleDateTimesFlat } from 'common/types';
import { selectSelectedDates } from 'slices/selectedDates';
import { convertOtherTzToLocal } from 'utils/dates.utils';
import { ExternalCalendarEventsToExternalCalendarEventsWithDateTimes, PeopleDateTimesFlatToPeopleDateTimes, startAndEndDateTimeToDateTimeSet } from './meetingTimes.helpers';
import { assert } from 'utils/misc.utils';

// All dates and times are stored in local time, except for the DateTime strings
// which are stored in UTC.
// We need to convert to UTC when sending/receiving data to/from the server.

type CreateMeetingInfo = {
  startTime: number,
  endTime: number,
  name: string,
  about: string,
};

export type ExternalCalendarEventWithDateTimes = {
  name: string;
  dateTimes: string[];  // sorted
};

type MeetingTimesState = {
  startTime: number | null,  // Local time (warning: can be a decimal!)
  endTime: number | null,    // Local time (warning: can be a decimal!)
  name: string | null,
  about: string | null,
  id: string | null,
  dates: string[],  // must be sorted at all times
  // The keys of availabilities and people must be exactly the same.
  availabilities: PeopleDateTimes,
  people: PeopleInfo,
  externalCalendarEvents?: ExternalCalendarEventWithDateTimes[],
  scheduledDateTimes?: DateTimeSet,
  fetchMeetingStatus: RequestStatus,
  createMeetingStatus: RequestStatus,
  editMeetingStatus: RequestStatus,
  deleteMeetingStatus: RequestStatus,
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
  people: {},
  fetchMeetingStatus: 'idle',
  createMeetingStatus: 'idle',
  editMeetingStatus: 'idle',
  deleteMeetingStatus: 'idle',
  error: null,
};

export const fetchMeeting = createAsyncThunk(
  'meetingTimes/fetchMeeting',
  async (id: string) => {
    return await client.getMeeting(id);
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
    return await client.createMeeting({
      name,
      about,
      dates: localDates,
      startTime: localStartTime,
      endTime: localEndTime,
    });
  },
);

export const editMeeting = createAsyncThunk<
  EditMeetingResponse,
  EditMeetingArgs
>(
  'meetingTimes/editMeeting',
  async (payload) => {
    return await client.editMeeting(payload);
  }
);

export const deleteMeeting = createAsyncThunk(
  'meetingTimes/deleteMeeting',
  async (id: string) => {
    return await client.deleteMeeting(id);
  }
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
      state.dates = state.dates.filter(d => d !== dateString);
    },
    setPeopleInfoAndAvailabilities: (state, { payload }: PayloadAction<{people: PeopleInfo, availabilities: PeopleDateTimesFlat}>) => {
      state.people = payload.people;
      state.availabilities = PeopleDateTimesFlatToPeopleDateTimes(payload.availabilities);
    },
    setUserAvailabilities: (state, action: PayloadAction<{user: string, dateTimes: DateTimeSet}>) => {
      const {user, dateTimes} = action.payload;
      state.availabilities[user] = dateTimes;
    },
    resetCreateMeetingStatus: (state) => {
      state.createMeetingStatus = 'idle';
      state.error = null;
    },
    resetEditMeetingStatusInternal: (state) => {
      state.editMeetingStatus = 'idle';
      state.error = null;
    },
    resetDeleteMeetingStatusInternal: (state) => {
      if (state.deleteMeetingStatus === 'failed') {
        return {
          ...state,
          deleteMeetingStatus: 'idle',
          error: null,
        };
      } else if (state.deleteMeetingStatus === 'succeeded') {
        return initialState;
      } else {
        throw new Error('deleteMeetingStatus should be failed or succeeded');
      }
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
        assert(state.fetchMeetingStatus !== 'loading', 'fetchMeetingStatus is already loading');
        return {
          ...initialState,
          fetchMeetingStatus: 'loading',
        };
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
        const scheduledDateTimes =
          payload.scheduledStartTime && payload.scheduledEndTime
          ? startAndEndDateTimeToDateTimeSet(payload.scheduledStartTime, payload.scheduledEndTime)
          : undefined;
        const externalCalendarEvents =
          payload.googleCalendarEvents
          ? ExternalCalendarEventsToExternalCalendarEventsWithDateTimes(payload.googleCalendarEvents)
          : undefined;
        const {startHour: startTime, endHour: endTime, dates} = convertOtherTzToLocal(
          { startHour: UTCStartTime, endHour: UTCEndTime, dates: UTCDates, timezone: '', },
        );
        const availabilities = PeopleDateTimesFlatToPeopleDateTimes(availabilitiesFlat);
        return {
          ...state,
          name,
          about,
          id,
          startTime,
          endTime,
          // FIXME: why is dates not mutable here...?
          dates: [...dates].sort(),
          people: payload.people,
          availabilities,
          scheduledDateTimes,
          externalCalendarEvents,
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
        const {startHour: startTime, endHour: endTime, dates} = convertOtherTzToLocal(
          { startHour: UTCStartTime, endHour: UTCEndTime, dates: UTCDates, timezone: '', },
        );
        const availabilities = PeopleDateTimesFlatToPeopleDateTimes(availabilitiesFlat);
        dates.sort();
        return {
          ...state,
          startTime,
          endTime,
          dates,
          availabilities,
          scheduledDateTimes: undefined,
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
      .addCase(editMeeting.pending, (state) => {
        state.editMeetingStatus = 'loading';
      })
      .addCase(editMeeting.fulfilled, (state, action) => {
        state.name = action.meta.arg.name;
        state.about = action.meta.arg.about;
        state.dates = action.meta.arg.dates;
        state.startTime = action.meta.arg.startTime;
        state.endTime = action.meta.arg.endTime;
        state.editMeetingStatus = 'succeeded';
      })
      .addCase(editMeeting.rejected, (state, action) => {
        state.editMeetingStatus = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(deleteMeeting.pending, (state) => {
        state.deleteMeetingStatus = 'loading';
      })
      .addCase(deleteMeeting.fulfilled, (state) => {
        // Ah...turns out that this is a bad idea. The DeleteMeetingModal is
        // still mounted when the request succeeds, which causes the spinner
        // to immediately show and the modal to unmount. This means the modal
        // never even has a chance to process the fact that deleteMeetingStatus
        // changed to 'succeeded'. So we need to delete the meeting info from
        // the resetDeleteMeetingStatus reducer instead.
        //
        // return {
        //   ...initialState,
        //   deleteMeetingStatus: 'succeeded',
        // };

        state.deleteMeetingStatus = 'succeeded';
      })
      .addCase(deleteMeeting.rejected, (state, action) => {
        state.deleteMeetingStatus = 'failed';
        state.error = action.error.message || null;
      });
  }
});

const {
  resetEditMeetingStatusInternal,
  resetDeleteMeetingStatusInternal,
} = meetingTimesSlice.actions;

export const resetEditMeetingStatus =
  (): AppThunk =>
  (dispatch, getState) => {
    dispatch(resetEditMeetingStatusInternal());
  };
export const resetDeleteMeetingStatus =
  (): AppThunk =>
  (dispatch, getState) => {
    dispatch(resetDeleteMeetingStatusInternal());
  };

export const {
  addDay,
  removeDay,
  setPeopleInfoAndAvailabilities,
  resetCreateMeetingStatus,
  setScheduledDateTimes,
  unsetScheduledDateTimes,
  reset: resetMeetingInfo,
} = meetingTimesSlice.actions;

export const selectScheduledDateTimes = (state: RootState) => state.meetingTimes.scheduledDateTimes || {};
export const selectMeetingIsScheduled = (state: RootState) => state.meetingTimes.scheduledDateTimes !== undefined;
export const selectSelfIsInAvailabilities = (state: RootState) =>
  state.authentication.userInfo !== null
  && state.meetingTimes.people.hasOwnProperty(state.authentication.userInfo.userID);

export default meetingTimesSlice.reducer;
