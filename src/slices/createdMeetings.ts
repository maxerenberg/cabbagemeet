import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { SerializedError } from '@reduxjs/toolkit';
import type { ServerMeetingShort } from 'app/client';
import client from "app/client";
import type { RootState } from "app/store";
import { addOffsetToDateTimes, UTCOffsetHours } from "utils/dates";

export type MeetingShortInfo = {
  id: string;
  name: string;
  // If the meeting has been scheduled, startTime and endTime are the scheduled
  // meeting start/end times; otherwise, they are the eligible start/end times
  // between which the meeting may be scheduled (which the meeting creator chose).
  startTime: number;  // local time, can be decimal
  endTime: number;    // local time, can be decimal
  // Dates will only be present if the meeting was NOT scheduled
  dates?: string[];  // YYYY-MM-DD
  scheduledDay?: string;  // YYYY-MM-DD
};

export type CreatedMeetingsState = {
  requestStatus: 'idle' | 'pending';
} | {
  requestStatus: 'fulfilled';
  meetings: MeetingShortInfo[];  // sorted in reverse chronological order
} | {
  requestStatus: 'rejected';
  error: SerializedError;
};
const initialState: CreatedMeetingsState = {
  requestStatus: 'idle',
};

export const fetchCreatedMeetings = createAsyncThunk<ServerMeetingShort[], void>(
  'createdMeetings/fetch',
  async (payload) => {
    return await client.getCreatedMeetings();
  }
);

export const createdMeetingsSlice = createSlice({
  name: 'createdMeetings',
  initialState: initialState as CreatedMeetingsState,
  reducers: {
    reset: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCreatedMeetings.pending, (state) => {
        return {
          requestStatus: 'pending',
        };
      })
      .addCase(fetchCreatedMeetings.fulfilled, (state, action) => {
        return {
          requestStatus: 'fulfilled',
          meetings: action.payload.map(serverMeeting => {
            // convert from UTC to local
            const {
              startTime: localStartTime,
              endTime: localEndTime,
              dates: localDates,
            } = addOffsetToDateTimes(
              {
                startTime: serverMeeting.startTime,
                endTime: serverMeeting.endTime,
                dates: serverMeeting.dates ?? [],
              },
              UTCOffsetHours
            );
            return {
              id: serverMeeting.id,
              name: serverMeeting.name,
              startTime: localStartTime,
              endTime: localEndTime,
              dates: localDates.length > 0 ? localDates.sort() : undefined,
              scheduledDay: serverMeeting.scheduledDay,
            };
          }),
        };
      })
      .addCase(fetchCreatedMeetings.rejected, (state, action) => {
        return {
          requestStatus: 'rejected',
          error: action.error,
        };
      });
  },
});

export const {
  reset: resetCreatedMeetings,
} = createdMeetingsSlice.actions;

export const selectFetchCreatedMeetingsStatus = (state: RootState) => state.createdMeetings.requestStatus;
export const selectFetchCreatedMeetingsError = (state: RootState) =>
state.createdMeetings.requestStatus === 'rejected'
  ? state.createdMeetings.error
  : null;
export const selectCreatedMeetings = (state: RootState) =>
  state.createdMeetings.requestStatus === 'fulfilled'
  ? state.createdMeetings.meetings
  : [];

export default createdMeetingsSlice.reducer;
