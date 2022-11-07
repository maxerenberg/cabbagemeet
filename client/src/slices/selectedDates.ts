import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store';
import type { DateSet } from 'common/types';
import { getDateString, today } from 'utils/dates.utils';

export type SelectedDatesType = {
  // These are the dates which the user has selected from the calendar
  // e.g. { '2022-08-27': true, '2022-08-28': true }
  dates: DateSet,
};

const initialState: SelectedDatesType = {
  // Select today's date by default
  dates: {
    [getDateString(today)]: true,
  },
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
    setDates: (state, action: PayloadAction<DateSet>) => {
      state.dates = action.payload;
    },
    reset: (state) => {
      return initialState;
    },
  }
});

export const {
  addDate,
  removeDate,
  setDates: setSelectedDates,
  reset: resetSelectedDates,
} = selectedDatesSlice.actions;

export const selectSelectedDates = (state: RootState) => state.selectedDates.dates;

export default selectedDatesSlice.reducer;
