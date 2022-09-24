import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import client from 'app/client';
import type { AppThunk, RootState } from 'app/store';
import type { DateTimeSet } from 'common/types';
import { setUserAvailabilities } from 'slices/meetingTimes';
import { assert } from 'utils/misc';

// TODO: place these fields directly into AvailabilitiesSelectionState
// and get rid of the type predicate functions
type SelModeNone = { type: 'none' };
type SelModeEditing = {
  type: 'editingSelf';
} | {
  type: 'editingOther';
  otherUser: string;
};
type SelModeSelectedOther = {
  type: 'selectedOther';
  otherUser: string;
};
type SelModeSubmitting = {
  type: 'submittingSelf';
  name: string;
} | {
  type: 'submittingOther';
  otherUser : string;
};

export type SelMode = SelModeNone | SelModeEditing | SelModeSelectedOther | SelModeSubmitting;

type CellCoord = {
  rowIdx: number;
  colIdx: number;
};

export type MouseState = {
  type: 'upNoCellsSelected';
} | {
  type: 'upCellsSelected' | 'down';
  downCell: CellCoord;
  curCell: CellCoord;
  downCellWasOriginallySelected: boolean;
};
const initialMouseState: MouseState = {type: 'upNoCellsSelected'};

export type AvailabilitiesSelectionState = {
  selMode: SelModeNone;
  hoverUser: string | null;
  hoverDateTime: string | null;
} | {
  selMode: SelModeEditing | SelModeSubmitting;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} | {
  selMode: SelModeSelectedOther;
};

function stateIsSubmitting(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeSubmitting,
  dateTimes: DateTimeSet,
  mouse: MouseState,
} {
  return state.selMode.type === 'submittingSelf'
      || state.selMode.type === 'submittingOther';
}

function stateIsEditing(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeEditing,
  dateTimes: DateTimeSet,
  mouse: MouseState,
} {
  return state.selMode.type === 'editingSelf'
      || state.selMode.type === 'editingOther';
}

function stateIsSubmittingOrEditing(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeEditing | SelModeSubmitting;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} {
  return stateIsSubmitting(state) || stateIsEditing(state);
}

function stateIsNone(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeNone,
  hoverUser: string | null;
  hoverDateTime: string | null;
} {
  return state.selMode.type === 'none';
}

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
    const state = selectSelModeAndDateTimes(rootState);
    // TODO: remove dependency between different slices
    const { startTime, endTime } = rootState.meetingTimes;

    // sanity check
    assert(startTime !== null && endTime !== null);
    assert(stateIsSubmitting(state));

    const dateTimes = state.dateTimes;
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
      return {
        selMode: {type: 'editingSelf'},
        dateTimes: {},
        mouse: initialMouseState,
      };
    },
    goBackToEditingSelf: (state) => {
      // This should only be used after an error occurs.
      // We could still be in the editingOther state if an error occurred
      // before we even had a chance to make the network request
      assert(state.selMode.type === 'editingSelf' || state.selMode.type === 'submittingSelf');
      state.selMode = {type: 'editingSelf'};
    },
    editOtherInternal: (state, action: PayloadAction<{otherUserAvailabilities: DateTimeSet}>) => {
      assert(state.selMode.type === 'selectedOther');
      const { otherUserAvailabilities } = action.payload;
      return {
        selMode: {type: 'editingOther', otherUser: state.selMode.otherUser},
        dateTimes: otherUserAvailabilities,
        mouse: initialMouseState,
      };
    },
    selectOther: (state, action: PayloadAction<{otherUser: string}>) => {
      assert(state.selMode.type === 'none' || state.selMode.type === 'selectedOther');
      return {
        selMode: {type: 'selectedOther', otherUser: action.payload.otherUser}
      };
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
      return {
        selMode: {type: 'selectedOther', otherUser: state.selMode.otherUser}
      };
    },
    reset: (state) => {
      return initialState;
    },
    addDateTime: (state, { payload: dateTime }: PayloadAction<string>) => {
      assert(stateIsEditing(state));
      state.dateTimes[dateTime] = true;
    },
    removeDateTime: (state, { payload: dateTime }: PayloadAction<string>) => {
      assert(stateIsEditing(state));
      delete state.dateTimes[dateTime];
    },
    addDateTimesAndResetMouse: (state, { payload: dateTimes }: PayloadAction<string[]>) => {
      assert(stateIsEditing(state));
      for (const dateTime of dateTimes) {
        state.dateTimes[dateTime] = true;
      }
      state.mouse = initialMouseState;
    },
    removeDateTimesAndResetMouse: (state, { payload: dateTimes }: PayloadAction<string[]>) => {
      assert(stateIsEditing(state));
      for (const dateTime of dateTimes) {
        delete state.dateTimes[dateTime];
      }
      state.mouse = initialMouseState;
    },
    setHoverUser: (state, { payload: hoverUser }: PayloadAction<string | null>) => {
      assert(stateIsNone(state));
      state.hoverUser = hoverUser;
    },
    setHoverDateTime: (state, { payload: hoverDateTime }: PayloadAction<string | null>) => {
      assert(stateIsNone(state));
      state.hoverDateTime = hoverDateTime;
    },
    notifyMouseUp: (state) => {
      if (stateIsEditing(state) && state.mouse.type === 'down') {
        state.mouse.type = 'upCellsSelected';
      }
    },
    notifyMouseDown: (state, { payload }: PayloadAction<{cell: CellCoord, wasOriginallySelected: boolean}>) => {
      assert(stateIsEditing(state));
      state.mouse = {
        type: 'down',
        downCell: payload.cell,
        curCell: payload.cell,
        downCellWasOriginallySelected: payload.wasOriginallySelected,
      };
    },
    notifyMouseEnter: (state, { payload }: PayloadAction<{cell: CellCoord}>) => {
      assert(stateIsEditing(state));
      if (state.mouse.type === 'down') {
        state.mouse.curCell = payload.cell;
      }
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
  addDateTimesAndResetMouse,
  removeDateTimesAndResetMouse,
  setHoverUser,
  setHoverDateTime,
  notifyMouseUp,
  notifyMouseDown,
  notifyMouseEnter,
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
  (state: AvailabilitiesSelectionState) => stateIsSubmittingOrEditing(state) ? state.dateTimes : {}
);
export const selectHoverUser = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => stateIsNone(state) ? state.hoverUser : null
);
export const selectHoverDateTime = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => stateIsNone(state) ? state.hoverDateTime : null
);
export const selectMouseState = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => stateIsEditing(state) ? state.mouse : null
);

export default availabilitiesSelectionSlice.reducer;
