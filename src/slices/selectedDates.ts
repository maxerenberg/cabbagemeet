import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store';
import { getDateString, today } from 'utils/dates';

export type SelectedDatesType = {
  // These are the dates which the user has selected from the calendar
  // e.g. { '2022-08-27': true, '2022-08-28': true }
  dates: {
    [date: string]: true
  },
  // This is true iff the user visited the DayPicker page at least once
  // (we track this so that we can redirect them if they visit '/create' directly)
  visitedDayPicker: boolean,
};

const initialState: SelectedDatesType = {
  // Select today's date by default
  dates: {
    [getDateString(today)]: true,
  },
  visitedDayPicker: false,
};

export const selectedDatesSlice = createSlice({
  name: 'selectedDates',
  initialState,
  reducers: {
    addDate: (state, action: PayloadAction<string>) => {
      const dateString = action.payload;
      state.dates[dateString] = true;
    },
    removeDate: (state, action: PayloadAction<string>) => {
      const dateString = action.payload;
      delete state.dates[dateString];
    },
    setVisitedDayPicker: (state) => {
      state.visitedDayPicker = true;
    },
  }
});

export const {
  addDate,
  removeDate,
  setVisitedDayPicker,
} = selectedDatesSlice.actions;

export const selectSelectedDates = (state: RootState) => state.selectedDates.dates;
export const selectVisitedDayPicker = (state: RootState) => state.selectedDates.visitedDayPicker;

export default selectedDatesSlice.reducer;
