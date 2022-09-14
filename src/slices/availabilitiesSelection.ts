import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import client from 'app/client';
import type { AppThunk, RootState } from 'app/store';
import type { DateTimeSet } from 'common/types';
import { setUserAvailabilities } from 'slices/meetingTimes';
import { assert } from 'utils/misc';

export type SelMode = {
  type: 'none' | 'editingSelf';
} | {
  type: 'selectedOther' | 'editingOther' | 'submittingOther';
  otherUser: string;
} | {
  type: 'submittingSelf';
  name: string;
};

export type AvailabilitiesSelectionState = {
  selMode: SelMode;
  dateTimes: DateTimeSet;
  hoverUser: string | null;     // can only be set if selMode.type === 'none'
  hoverDateTime: string | null; // can only be set if selMode.type === 'none'
};

const initialState: AvailabilitiesSelectionState = {
  selMode: { type: 'none' },
  dateTimes: {},
  hoverUser: null,
  hoverDateTime: null,
};

export const submitAvailabilities = createAsyncThunk<
  { user: string, dateTimes: DateTimeSet },
  { user: string },
  { state: RootState }
>(
  'availabilitiesSelection/submitAvailabilities',
  async (payload, { getState, dispatch }) => {
    const { user } = payload;
    const rootState = getState();
    // TODO: remove dependency between different slices
    const { startTime, endTime } = rootState.meetingTimes;
    // sanity check
    if (startTime === null || endTime === null) {
      throw new Error("start and end times have not been set");
    }
    const dateTimes = selectSelModeAndDateTimes(rootState).dateTimes;
    await client.submitAvailabilities(user, Object.keys(dateTimes));
    // TODO: don't dispatch action to another slice
    dispatch(setUserAvailabilities({ user, dateTimes }));
    return { user, dateTimes };
  },
);

export const availabilitiesSelectionSlice = createSlice({
  name: 'availabilitiesSelection',
  initialState,
  reducers: {
    editSelf: (state) => {
      assert(state.selMode.type === 'none');
      state.selMode = {type: 'editingSelf'};
      state.hoverUser = null;
      state.hoverDateTime = null;
    },
    goBackToEditingSelf: (state) => {
      // Should be used after an error occurs
      // We could still be in the editingOther state if an error occurred
      // before we even had a chance to make the network request
      assert(state.selMode.type === 'editingSelf' || state.selMode.type === 'submittingSelf');
      state.selMode = {type: 'editingSelf'};
    },
    editOtherInternal: (state, action: PayloadAction<{otherUserAvailabilities: DateTimeSet}>) => {
      assert(state.selMode.type === 'selectedOther');
      const { otherUserAvailabilities } = action.payload;
      state.selMode = {type: 'editingOther', otherUser: state.selMode.otherUser};
      state.dateTimes = otherUserAvailabilities;
    },
    selectOther: (state, action: PayloadAction<{otherUser: string}>) => {
      assert(state.selMode.type === 'none' || state.selMode.type === 'selectedOther');
      state.selMode = {type: 'selectedOther', otherUser: action.payload.otherUser};
      state.hoverUser = null;
      state.hoverDateTime = null;
    },
    goBackToEditingOther: (state) => {
      // Should be used after an error occurs
      // We could still be in the editingOther state if an error occurred
      // before we even had a chance to make the network request
      assert(state.selMode.type === 'editingOther' || state.selMode.type === 'submittingOther');
      state.selMode = {type: 'editingOther', otherUser: state.selMode.otherUser};
    },
    cancelEditingOther: (state) => {
      assert(state.selMode.type === 'editingOther');
      state.selMode = {type: 'selectedOther', otherUser: state.selMode.otherUser};
      state.dateTimes = {};
    },
    reset: (state) => {
      return initialState;
    },
    addDateTime: (state, { payload: dateTime }: PayloadAction<string>) => {
      assert(state.selMode.type === 'editingSelf' || state.selMode.type === 'editingOther');
      state.dateTimes[dateTime] = true;
    },
    removeDateTime: (state, { payload: dateTime }: PayloadAction<string>) => {
      assert(state.selMode.type === 'editingSelf' || state.selMode.type === 'editingOther');
      delete state.dateTimes[dateTime];
    },
    setHoverUser: (state, { payload: hoverUser }: PayloadAction<string | null>) => {
      assert(state.selMode.type === 'none');
      state.hoverUser = hoverUser;
    },
    setHoverDateTime: (state, { payload: hoverDateTime }: PayloadAction<string | null>) => {
      assert(state.selMode.type === 'none');
      state.hoverDateTime = hoverDateTime;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitAvailabilities.fulfilled, (state) => {
        assert(
          state.selMode.type === 'submittingSelf' || state.selMode.type === 'submittingOther',
          `Expecting submittingSelf or submittingOther, got ${state.selMode.type}`
        );
        console.log('Submission succeeded');
      })
      .addCase(submitAvailabilities.pending, (state, action) => {
        if (state.selMode.type === 'editingSelf') {
          state.selMode = {type: 'submittingSelf', name: action.meta.arg.user};
        } else if (state.selMode.type === 'editingOther') {
          state.selMode = {type: 'submittingOther', otherUser: state.selMode.otherUser};
        } else {
          throw new Error(`Expecting submittingSelf or submittingOther, got ${state.selMode.type}`);
        }
      })
      .addCase(submitAvailabilities.rejected, (state) => {
        assert(
          state.selMode.type === 'submittingSelf' || state.selMode.type === 'submittingOther',
          `Expecting submittingSelf or submittingOther, got ${state.selMode.type}`
        );
        console.log('Submission failed');
      });
  },
});

export const {
  editSelf,
  goBackToEditingSelf,
  selectOther,
  goBackToEditingOther,
  cancelEditingOther,
  reset: resetSelection,
  addDateTime,
  removeDateTime,
  setHoverUser,
  setHoverDateTime,
} = availabilitiesSelectionSlice.actions;
const {
  editOtherInternal,
} = availabilitiesSelectionSlice.actions;

export const submitSelf =
  (name: string): AppThunk<Promise<{ user: string, dateTimes: DateTimeSet }>> =>
  async (dispatch, getState) => {
    const state = selectSelModeAndDateTimes(getState());
    assert(state.selMode.type === 'editingSelf');
    return await dispatch(submitAvailabilities({user: name})).unwrap();
  };
export const submitOther =
  (): AppThunk<Promise<{ user: string, dateTimes: DateTimeSet }>> =>
  async (dispatch, getState) => {
    const state = selectSelModeAndDateTimes(getState());
    assert(state.selMode.type === 'editingOther');
    return await dispatch(submitAvailabilities({user: state.selMode.otherUser})).unwrap();
  };
export const editOther =
  (): AppThunk =>
  (dispatch, getState) => {
    const rootState = getState();
    const state = selectSelModeAndDateTimes(rootState);
    assert(state.selMode.type === 'selectedOther');
    const otherUser = state.selMode.otherUser;
    const otherUserAvailabilities = rootState.meetingTimes.availabilities[otherUser];
    assert(otherUserAvailabilities !== undefined);
    dispatch(editOtherInternal({ otherUserAvailabilities }));
  };

export const selectSelModeAndDateTimes = (state: RootState) => state.availabilitiesSelection;
export const selectSelMode = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => state.selMode
);
export const selectSelectedTimes = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => state.dateTimes
);
export const selectHoverUser = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => state.hoverUser
);
export const selectHoverDateTime = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => state.hoverDateTime
);

export default availabilitiesSelectionSlice.reducer;
