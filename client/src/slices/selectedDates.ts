import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store';
import type { DateSet } from 'common/types';

export type SelectedDatesType = {
  // These are the dates which the user has selected from the calendar
  // e.g. { '2022-08-27': true, '2022-08-28': true }
  dates: DateSet;
  modifiedSinceLastReset: boolean;
};

const initialState: SelectedDatesType = {
  dates: {},
  modifiedSinceLastReset: false,
};

export const selectedDatesSlice = createSlice({
  name: 'selectedDates',
  initialState,
  reducers: {
    selectDefaultDate: (state, {payload}: PayloadAction<string>) => {
      state.dates = {[payload]: true};
    },
    addDate: (state, action: PayloadAction<string>) => {
      const dateString = action.payload;
      state.dates[dateString] = true;
      state.modifiedSinceLastReset = true;
    },
    removeDate: (state, action: PayloadAction<string>) => {
      const dateString = action.payload;
      delete state.dates[dateString];
      state.modifiedSinceLastReset = true;
    },
    setDates: (state, action: PayloadAction<DateSet>) => {
      state.dates = action.payload;
      state.modifiedSinceLastReset = true;
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
  selectDefaultDate,
} = selectedDatesSlice.actions;

export const selectSelectedDates = (state: RootState) => state.selectedDates.dates;
export const selectSelectedDatesModifiedSinceLastReset = (state: RootState) => state.selectedDates.modifiedSinceLastReset;

export default selectedDatesSlice.reducer;
