import { configureStore } from '@reduxjs/toolkit';
import meetingTimesReducer from '../features/daypicker/meetingTimesSlice';

export const store = configureStore({
  reducer: {
    meetingTimes: meetingTimesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
