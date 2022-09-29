// TODO: avoid code duplication with createdMeetings.ts

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { ServerMeetingShort } from 'app/client';
import client from "app/client";
import type { RootState } from "app/store";
import { addOffsetToDateTimes, UTCOffsetHours } from "utils/dates";
import type { CreatedMeetingsState } from "./createdMeetings";

export type RespondedMeetingsState = CreatedMeetingsState;
const initialState: RespondedMeetingsState = {
  requestStatus: 'idle',
};

export const fetchRespondedMeetings = createAsyncThunk<ServerMeetingShort[], void>(
  'respondedMeetings/fetch',
  async (payload) => {
    return await client.getRespondedMeetings();
  }
);

export const respondedMeetingsSlice = createSlice({
  name: 'respondedMeetings',
  initialState: initialState as RespondedMeetingsState,
  reducers: {
    reset: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRespondedMeetings.pending, (state) => {
        return {
          requestStatus: 'pending',
        };
      })
      .addCase(fetchRespondedMeetings.fulfilled, (state, action) => {
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
      .addCase(fetchRespondedMeetings.rejected, (state, action) => {
        return {
          requestStatus: 'rejected',
          error: action.error,
        };
      });
  },
});

export const {
  reset: resetRespondedMeetings,
} = respondedMeetingsSlice.actions;

export const selectFetchRespondedMeetingsStatus = (state: RootState) => state.respondedMeetings.requestStatus;
export const selectFetchRespondedMeetingsError = (state: RootState) =>
state.respondedMeetings.requestStatus === 'rejected'
  ? state.respondedMeetings.error
  : null;
export const selectRespondedMeetings = (state: RootState) =>
  state.respondedMeetings.requestStatus === 'fulfilled'
  ? state.respondedMeetings.meetings
  : [];

export default respondedMeetingsSlice.reducer;
