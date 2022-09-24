import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import authenticationReducer from 'slices/authentication';
import availabilitiesSelectionReducer from 'slices/availabilitiesSelection';
import meetingTimesReducer from 'slices/meetingTimes';
import resetPasswordReducer from 'slices/resetPassword';
import selectedDatesReducer from 'slices/selectedDates';

export const store = configureStore({
  reducer: {
    authentication: authenticationReducer,
    availabilitiesSelection: availabilitiesSelectionReducer,
    meetingTimes: meetingTimesReducer,
    resetPassword: resetPasswordReducer,
    selectedDates: selectedDatesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
