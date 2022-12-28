import { combineReducers, configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { enhancedApi } from 'slices/enhancedApi';
import authenticationReducer from 'slices/authentication';
import availabilitiesSelectionReducer from 'slices/availabilitiesSelection';
import currentMeetingReducer from 'slices/currentMeeting';
import selectedDatesReducer from 'slices/selectedDates';

const rootReducer = combineReducers({
  [enhancedApi.reducerPath]: enhancedApi.reducer,
  authentication: authenticationReducer,
  availabilitiesSelection: availabilitiesSelectionReducer,
  currentMeeting: currentMeetingReducer,
  selectedDates: selectedDatesReducer,
});

export function setupStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(enhancedApi.middleware),
  });
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
