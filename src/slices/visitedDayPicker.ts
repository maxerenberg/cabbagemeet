import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// This is true iff the user visited the DayPicker page at least once
// (we track this so that we can redirect them if they visit '/create' directly)

export const visitedDayPickerSlice = createSlice({
  name: 'visitedDayPicker',
  initialState: false as boolean,
  reducers: {
    setVisitedDayPicker: (state, action: PayloadAction<boolean>) => {
      return action.payload;
    }
  }
});

export const {setVisitedDayPicker} = visitedDayPickerSlice.actions;

export default visitedDayPickerSlice.reducer;
