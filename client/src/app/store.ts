import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import authenticationReducer from 'slices/authentication';
import availabilitiesSelectionReducer from 'slices/availabilitiesSelection';
import createdMeetingsReducer from 'slices/createdMeetings';
import meetingTimesReducer from 'slices/meetingTimes';
import resetPasswordReducer from 'slices/resetPassword';
import respondedMeetingsReducer from 'slices/respondedMeetings';
import selectedDatesReducer from 'slices/selectedDates';
import visitedDayPickerReducer from 'slices/visitedDayPicker';

export const store = configureStore({
  reducer: {
    authentication: authenticationReducer,
    availabilitiesSelection: availabilitiesSelectionReducer,
    createdMeetings: createdMeetingsReducer,
    meetingTimes: meetingTimesReducer,
    resetPassword: resetPasswordReducer,
    respondedMeetings: respondedMeetingsReducer,
    selectedDates: selectedDatesReducer,
    visitedDayPicker: visitedDayPickerReducer,
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
