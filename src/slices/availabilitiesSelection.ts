import { createAsyncThunk, createSelector, createSlice, SerializedError } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import client, { SubmitScheduleResponse, SubmitUnscheduleResponse } from 'app/client';
import type { AppThunk, RootState } from 'app/store';
import type { DateTimeSet } from 'common/types';
import {
  setScheduledDateTimes,
  setPeopleInfoAndAvailabilities,
  unsetScheduledDateTimes,
} from 'slices/meetingTimes';
import { assert } from 'utils/misc';
import { addMinutesToDateTimeString } from 'utils/dates';

// TODO: place these fields directly into AvailabilitiesSelectionState
// and get rid of the type predicate functions
type SelModeNone = { type: 'none' };
type SelModeEditing = {
  type: 'editingSelf';
} | {
  type: 'editingOther';
  otherUserID: string;
} | {
  type: 'editingSchedule';
};
type SelModeSelectedOther = {
  type: 'selectedOther';
  otherUserID: string;
};
type SelModeSubmittingSelf = {
  type: 'submittingSelf';
};
type SelModeSubmittedSelf = {
  type: 'submittedSelf';
};
type SelModeRejectedSelf = {
  type: 'rejectedSelf';
  error: SerializedError;
};
type SelModeSubmittingOther = {
  type: 'submittingOther';
  otherUserID : string;
};
type SelModeSubmittedOther = {
  type: 'submittedOther';
  otherUserID : string;
};
type SelModeRejectedOther = {
  type: 'rejectedOther';
  otherUserID : string;
  error: SerializedError;
};
type SelModeSubmittingSchedule = {
  type: 'submittingSchedule';
};
type SelModeSubmittingUnschedule = {
  type: 'submittingUnschedule';
};
type SelModeSubmittedSchedule = {
  type: 'submittedSchedule';
};
type SelModeSubmittedUnschedule = {
  type: 'submittedUnschedule';
};
type SelModeFulfilled = SelModeSubmittedSelf | SelModeSubmittedOther | SelModeSubmittedSchedule | SelModeSubmittedUnschedule;
type SelModeRejectedSchedule = {
  type: 'rejectedSchedule';
  error: SerializedError;
};
type SelModeRejectedUnschedule = {
  type: 'rejectedUnschedule';
  error: SerializedError;
};
type SelModeRejected = SelModeRejectedSelf | SelModeRejectedOther | SelModeRejectedSchedule | SelModeRejectedUnschedule;

type SelModeSubmittingDateTimes = SelModeSubmittingSelf | SelModeSubmittingOther | SelModeSubmittingSchedule;
type SelModeSubmittedDateTimes = SelModeSubmittedSelf | SelModeSubmittedOther | SelModeSubmittedSchedule;
type SelModeRejectedDateTimes = SelModeRejectedSelf | SelModeRejectedOther | SelModeRejectedSchedule;

export type SelMode =
  SelModeNone | SelModeEditing | SelModeSelectedOther | SelModeSubmittingDateTimes
  | SelModeSubmittingUnschedule | SelModeFulfilled | SelModeRejected;

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
  selMode: SelModeEditing
         | SelModeSubmittingDateTimes
         | SelModeSubmittedDateTimes
         | SelModeRejectedDateTimes;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} | {
  selMode: SelModeSubmittingUnschedule
         | SelModeSubmittedUnschedule
         | SelModeRejectedUnschedule
         | SelModeSelectedOther;
};

function stateIsSubmittingAvailabilities(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeSubmittingSelf | SelModeSubmittingOther;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} {
  return state.selMode.type === 'submittingSelf'
      || state.selMode.type === 'submittingOther';
}

function stateIsSubmittingDateTimes(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeSubmittingDateTimes;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} {
  return state.selMode.type === 'submittingSelf'
      || state.selMode.type === 'submittingOther'
      || state.selMode.type === 'submittingSchedule';
}

function stateIsEditing(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeEditing,
  dateTimes: DateTimeSet,
  mouse: MouseState,
} {
  return state.selMode.type === 'editingSelf'
      || state.selMode.type === 'editingOther'
      || state.selMode.type === 'editingSchedule';
}

function stateIsSubmittingOrEditingDateTimes(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeEditing | SelModeSubmittingDateTimes;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} {
  return stateIsSubmittingDateTimes(state) || stateIsEditing(state);
}

function stateIsSubmittingSchedule(state: AvailabilitiesSelectionState): state is {
  selMode: {type: 'submittingSchedule'};
  dateTimes: DateTimeSet;
  mouse: MouseState;
} {
  return state.selMode.type === 'submittingSchedule';
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

function isSubmittingAsGuest(args: { userID: string } | { name: string }): args is { name: string } {
  return !args.hasOwnProperty('userID');
}

export const submitAvailabilities = createAsyncThunk<
  void,
  { userID: string } | { name: string },
  { state: RootState }
>(
  'availabilitiesSelection/submitAvailabilities',
  async (payload, { getState, dispatch }) => {
    const rootState = getState();
    const state = selectSelModeAndDateTimes(rootState);
    // TODO: remove dependency between different slices
    const { startTime, endTime } = rootState.meetingTimes;

    // sanity check
    assert(startTime !== null && endTime !== null);
    assert(stateIsSubmittingAvailabilities(state));

    const dateTimes = state.dateTimes;
    const dateTimesFlat = Object.keys(dateTimes);
    const submitArgs = isSubmittingAsGuest(payload) ? {
      name: payload.name,
      dateTimes: dateTimesFlat,
    } : {
      userID: payload.userID,
      dateTimes: dateTimesFlat,
    };
    const {people, availabilities} = await client.submitAvailabilities(submitArgs);
    // TODO: don't dispatch action to another slice
    dispatch(setPeopleInfoAndAvailabilities({ people, availabilities }));
  },
);

export const submitSchedule = createAsyncThunk<
  SubmitScheduleResponse,
  void,
  { state: RootState }
>(
  'availabilitiesSelection/submitSchedule',
  async (payload, { getState, dispatch }) => {
    const state = getState().availabilitiesSelection;
    assert(stateIsSubmittingSchedule(state));
    const dateTimes = state.dateTimes;
    const dateTimesFlat = Object.keys(dateTimes).sort();
    if (dateTimesFlat.length === 0) {
      throw new Error('Must select at least one time');
    }
    const startDateTime = dateTimesFlat[0];
    const endDateTime = addMinutesToDateTimeString(dateTimesFlat[dateTimesFlat.length - 1], 30);
    console.log(`startDateTime: ${startDateTime}, endDateTime: ${endDateTime}`);
    const response = await client.submitSchedule(startDateTime, endDateTime);
    dispatch(setScheduledDateTimes(dateTimes));
    return response;
  }
);

export const submitUnschedule = createAsyncThunk<
  SubmitUnscheduleResponse,
  void,
  { state: RootState }
>(
  'availabilities/submitUnschedule',
  async (payload, { dispatch }) => {
    const response = await client.submitUnschedule();
    dispatch(unsetScheduledDateTimes());
    return response;
  }
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
    createSchedule: (state) => {
      assert(state.selMode.type === 'none');
      return {
        selMode: {type: 'editingSchedule'},
        dateTimes: {},
        mouse: initialMouseState,
      };
    },
    goBackToEditingSchedule: (state) => {
      assert(state.selMode.type === 'rejectedSchedule');
      state.selMode = {type: 'editingSchedule'};
    },
    editOtherInternal: (state, action: PayloadAction<{otherUserAvailabilities: DateTimeSet}>) => {
      assert(state.selMode.type === 'selectedOther');
      const { otherUserAvailabilities } = action.payload;
      return {
        selMode: {type: 'editingOther', otherUserID: state.selMode.otherUserID},
        dateTimes: otherUserAvailabilities,
        mouse: initialMouseState,
      };
    },
    selectOther: (state, action: PayloadAction<{otherUserID: string}>) => {
      assert(state.selMode.type === 'none' || state.selMode.type === 'selectedOther');
      return {
        selMode: {type: 'selectedOther', otherUserID: action.payload.otherUserID}
      };
    },
    goBackToEditingOther: (state) => {
      // Should be used after an error occurs
      // We could still be in the editingOther state if an error occurred
      // before we even had a chance to make the network request
      assert(state.selMode.type === 'editingOther' || state.selMode.type === 'submittingOther');
      state.selMode = {type: 'editingOther', otherUserID: state.selMode.otherUserID};
    },
    cancelEditingOther: (state) => {
      assert(state.selMode.type === 'editingOther');
      return {
        selMode: {type: 'selectedOther', otherUserID: state.selMode.otherUserID}
      };
    },
    editSelfAsOtherInternal: (state, { payload }: PayloadAction<{selfUserID: string, selfAvailabilities: DateTimeSet}>) => {
      assert(state.selMode.type === 'none');
      return {
        selMode: {type: 'editingOther', otherUserID: payload.selfUserID},
        dateTimes: payload.selfAvailabilities,
        mouse: initialMouseState,
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
      if (state.selMode.type === 'editingSchedule') {
        state.dateTimes = {};
        state.mouse.downCellWasOriginallySelected = false;
      }
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
      .addCase(submitAvailabilities.pending, (state, action) => {
        if (state.selMode.type === 'editingSelf') {
          state.selMode = {type: 'submittingSelf'};
        } else if (state.selMode.type === 'editingOther') {
          state.selMode = {type: 'submittingOther', otherUserID: state.selMode.otherUserID};
        } else {
          throw new Error(`Expecting submittingSelf or submittingOther, got ${state.selMode.type}`);
        }
      })
      .addCase(submitAvailabilities.fulfilled, (state) => {
        if (state.selMode.type === 'submittingSelf') {
          state.selMode = {type: 'submittedSelf'};
        } else if (state.selMode.type === 'submittingOther') {
          state.selMode = {type: 'submittedOther', otherUserID: state.selMode.otherUserID};
        } else {
          throw new Error();
        }
      })
      .addCase(submitAvailabilities.rejected, (state, action) => {
        if (state.selMode.type === 'submittingSelf') {
          state.selMode = {type: 'rejectedSelf', error: action.error};
        } else if (state.selMode.type === 'submittingOther') {
          state.selMode = {type: 'rejectedOther', otherUserID: state.selMode.otherUserID, error: action.error};
        } else {
          throw new Error();
        }
      })
      .addCase(submitSchedule.pending, (state) => {
        assert(state.selMode.type === 'editingSchedule');
        state.selMode = {type: 'submittingSchedule'};
      })
      .addCase(submitSchedule.fulfilled, (state) => {
        assert(state.selMode.type === 'submittingSchedule');
        state.selMode = {type: 'submittedSchedule'};
      })
      .addCase(submitSchedule.rejected, (state, action) => {
        assert(state.selMode.type === 'submittingSchedule');
        state.selMode = {type: 'rejectedSchedule', error: action.error};
      })
      .addCase(submitUnschedule.pending, (state) => {
        assert(state.selMode.type === 'none');
        state.selMode = {type: 'submittingUnschedule'};
      })
      .addCase(submitUnschedule.fulfilled, (state) => {
        assert(state.selMode.type === 'submittingUnschedule');
        state.selMode = {type: 'submittedUnschedule'};
      })
      .addCase(submitUnschedule.rejected, (state, action) => {
        assert(state.selMode.type === 'submittingUnschedule');
        state.selMode = {type: 'rejectedUnschedule', error: action.error};
      });
  },
});

export const {
  editSelf,
  goBackToEditingSelf,
  createSchedule,
  goBackToEditingSchedule,
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
  editSelfAsOtherInternal,
} = availabilitiesSelectionSlice.actions;

export const submitSelf =
  (name: string): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = selectSelModeAndDateTimes(getState());
    assert(state.selMode.type === 'editingSelf');
    return await dispatch(submitAvailabilities({name})).unwrap();
  };
export const submitOther =
  (): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = selectSelModeAndDateTimes(getState());
    assert(state.selMode.type === 'editingOther');
    return await dispatch(submitAvailabilities({userID: state.selMode.otherUserID})).unwrap();
  };
export const editOther =
  (): AppThunk =>
  (dispatch, getState) => {
    const rootState = getState();
    const state = selectSelModeAndDateTimes(rootState);
    assert(state.selMode.type === 'selectedOther');
    const otherUser = state.selMode.otherUserID;
    const otherUserAvailabilities = rootState.meetingTimes.availabilities[otherUser];
    assert(otherUserAvailabilities !== undefined);
    dispatch(editOtherInternal({ otherUserAvailabilities }));
  };
export const editSelfAsOther =
  (): AppThunk =>
  (dispatch, getState) => {
  // Should be used when the current user is logged in and they want to edit their
  // own availabilities
  const rootState = getState();
  const state = selectSelModeAndDateTimes(rootState);
  assert(state.selMode.type === 'none');
  const selfUserID = rootState.authentication.userID;
  assert(selfUserID !== null);
  const selfAvailabilities = rootState.meetingTimes.availabilities[selfUserID];
  assert(selfAvailabilities !== undefined);
  dispatch(editSelfAsOtherInternal({selfUserID, selfAvailabilities}));
};

export const selectSelModeAndDateTimes = (state: RootState) => state.availabilitiesSelection;
export const selectSelMode = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => state.selMode
);
export const selectSelectedTimes = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) =>
    stateIsSubmittingOrEditingDateTimes(state) ? state.dateTimes : {}
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
