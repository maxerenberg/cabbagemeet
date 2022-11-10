import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { enhancedApi } from 'slices/enhancedApi';
import authenticationReducer from 'slices/authentication';
import availabilitiesSelectionReducer from 'slices/availabilitiesSelection';
import currentMeetingReducer from 'slices/currentMeeting';
import resetPasswordReducer from 'slices/resetPassword';
import selectedDatesReducer from 'slices/selectedDates';
import visitedDayPickerReducer from 'slices/visitedDayPicker';

export const store = configureStore({
  reducer: {
    [enhancedApi.reducerPath]: enhancedApi.reducer,
    authentication: authenticationReducer,
    availabilitiesSelection: availabilitiesSelectionReducer,
    currentMeeting: currentMeetingReducer,
    resetPassword: resetPasswordReducer,
    selectedDates: selectedDatesReducer,
    visitedDayPicker: visitedDayPickerReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(enhancedApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
