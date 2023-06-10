import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "app/store";

export type CurrentMeetingSliceType = {
  meetingID?: string;
};

const initialState: CurrentMeetingSliceType = {};

export const currentMeetingSlice = createSlice({
  name: 'currentMeeting',
  initialState,
  reducers: {
    setMeetingID(state, {payload: meetingID}: PayloadAction<string | undefined>) {
      state.meetingID = meetingID;
    },
  },
});

export const {
  setMeetingID: setCurrentMeetingID,
} = currentMeetingSlice.actions;

export const selectCurrentMeetingID = (state: RootState) => state.currentMeeting.meetingID;

export default currentMeetingSlice.reducer;
