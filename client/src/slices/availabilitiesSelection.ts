import { createSelector, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store';
import type { DateTimeSet } from 'common/types';
import { assert } from 'utils/misc.utils';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { selectCurrentMeetingID } from './currentMeeting';
import { useCallback } from 'react';
import { useGetMeetingQuery } from './enhancedApi';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';

// TODO: place these fields directly into AvailabilitiesSelectionState
// and get rid of the type predicate functions
type SelModeNone = { type: 'none' };
type SelModeEditing = {
  // TODO: distinguish between logged in vs non-logged in (i.e. guest)
  type: 'editingSelf';
} | {
  type: 'editingOther';
  otherUserID: number;  // respondentID
} | {
  type: 'editingSchedule';
};
type SelModeSelectedUser = {
  type: 'selectedUser';
  selectedUserID: number;  // respondentID
};

export type SelMode = SelModeNone | SelModeEditing | SelModeSelectedUser;

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
  hoverUser: number | null;
  hoverDateTime: string | null;
} | {
  selMode: SelModeEditing;
  dateTimes: DateTimeSet;
  mouse: MouseState;
} | {
  selMode: SelModeSelectedUser;
};

function stateIsEditing(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeEditing,
  dateTimes: DateTimeSet,
  mouse: MouseState,
} {
  return state.selMode.type === 'editingSelf'
      || state.selMode.type === 'editingOther'
      || state.selMode.type === 'editingSchedule';
}

function stateIsNone(state: AvailabilitiesSelectionState): state is {
  selMode: SelModeNone,
  hoverUser: number | null;
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

export const availabilitiesSelectionSlice = createSlice({
  name: 'availabilitiesSelection',
  initialState,
  reducers: {
    createSchedule: (state) => {
      assert(state.selMode.type === 'none');
      return {
        selMode: {type: 'editingSchedule'},
        dateTimes: {},
        mouse: initialMouseState,
      };
    },
    editUserInternal: (state, {payload: {availabilities, isSelf}}: PayloadAction<{availabilities: DateTimeSet, isSelf: boolean}>) => {
      let selMode: {type: 'editingSelf'} | {type: 'editingOther', otherUserID: number} | undefined;
      if (isSelf) {
        assert(state.selMode.type === 'none' || state.selMode.type === 'selectedUser');
        selMode = {type: 'editingSelf'};
      } else {
        assert(state.selMode.type === 'selectedUser');
        selMode = {type: 'editingOther', otherUserID: state.selMode.selectedUserID};
      }
      return {
        selMode,
        dateTimes: availabilities,
        mouse: initialMouseState,
      };
    },
    selectUser: (state, action: PayloadAction<{userID: number}>) => {
      assert(state.selMode.type === 'none' || state.selMode.type === 'selectedUser');
      return {
        selMode: {type: 'selectedUser', selectedUserID: action.payload.userID}
      };
    },
    cancelEditingOther: (state) => {
      assert(state.selMode.type === 'editingOther');
      return {
        selMode: {type: 'selectedUser', selectedUserID: state.selMode.otherUserID}
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
    setHoverUser: (state, { payload: hoverUser }: PayloadAction<number | null>) => {
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
});

export const {
  createSchedule,
  selectUser,
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
  editUserInternal,
} = availabilitiesSelectionSlice.actions;

function selectSelectedUserID(rootState: RootState): number | undefined {
  const state = selectSelModeAndDateTimes(rootState);
  if (state.selMode.type === 'selectedUser') {
    return state.selMode.selectedUserID;
  }
  return undefined;
}

export function useEditSelectedUser() {
  const dispatch = useAppDispatch();
  const selectedRespondentID = useAppSelector(selectSelectedUserID);
  const {availabilities, selfRespondentID} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({
      availabilities: selectedRespondentID !== undefined
        ? meeting?.respondents[selectedRespondentID]?.availabilities
        : undefined,
      selfRespondentID: meeting?.selfRespondentID,
    })
  );
  const editSelectedUser = useCallback(() => {
    if (availabilities !== undefined && selectedRespondentID !== undefined) {
      dispatch(editUserInternal({
        availabilities,
        isSelf: selectedRespondentID === selfRespondentID,
      }));
    }
  }, [dispatch, availabilities, selectedRespondentID, selfRespondentID]);
  return editSelectedUser;
}

export function useEditSelfWhenLoggedIn() {
  const dispatch = useAppDispatch();
  const meetingID = useAppSelector(selectCurrentMeetingID);
  const {availabilities} = useGetMeetingQuery(meetingID || 0, {
    skip: meetingID !== undefined,
    selectFromResult: ({data: meeting}) => ({
      availabilities: meeting?.selfRespondentID !== undefined
        ? meeting.respondents[meeting.selfRespondentID]!.availabilities
        : undefined,
    })
  });
  const editSelf = useCallback(() => {
    dispatch(editUserInternal({
      availabilities: availabilities || {},
      isSelf: true,
    }));
  }, [dispatch, availabilities]);
  return editSelf;
}

export function useEditSelfAsGuest() {
  const dispatch = useAppDispatch();
  const editSelfAsGuest = useCallback(() => {
    dispatch(editUserInternal({availabilities: {}, isSelf: true}));
  }, [dispatch]);
  return editSelfAsGuest;
}

export function useEditSelf(isLoggedIn: boolean) {
  const editSelfWhenLoggedIn = useEditSelfWhenLoggedIn();
  const editSelfAsGuest = useEditSelfAsGuest();
  return isLoggedIn ? editSelfWhenLoggedIn : editSelfAsGuest;
}

export const selectSelModeAndDateTimes = (state: RootState) => state.availabilitiesSelection;
export const selectSelMode = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) => state.selMode
);
// Return a constant value instead of a new `{}` every time to avoid triggering updates
const emptyDateTimeSet: DateTimeSet = {};
export const selectSelectedTimes = createSelector(
  [selectSelModeAndDateTimes],
  (state: AvailabilitiesSelectionState) =>
    stateIsEditing(state) ? state.dateTimes : emptyDateTimeSet
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
