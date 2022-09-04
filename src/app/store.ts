import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import meetingTimesReducer from 'slices/meetingTimes';
import selectedDatesReducer from 'slices/selectedDates';
import availabilitiesSelectionReducer from 'slices/availabilitiesSelection';

export const store = configureStore({
  reducer: {
    meetingTimes: meetingTimesReducer,
    selectedDates: selectedDatesReducer,
    availabilitiesSelection: availabilitiesSelectionReducer,
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
