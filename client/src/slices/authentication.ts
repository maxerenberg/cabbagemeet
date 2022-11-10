import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppThunk, RootState } from 'app/store';
import { getLocalToken, removeLocalToken, setLocalToken } from 'utils/auth.utils';

export type AuthenticationState = {
  token: string | null;
};

const initialState: AuthenticationState = {
  token: getLocalToken(),
};

export const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: initialState as AuthenticationState,  // needed to prevent type narrowing
  reducers: {
    setTokenInternal: (state, {payload: token}: PayloadAction<string | null>) => {
      state.token = token;
    },
  },
});

const { setTokenInternal } = authenticationSlice.actions;

export const setToken =
  (token: string): AppThunk =>
  (dispatch) => {
    setLocalToken(token);
    dispatch(setTokenInternal(token));
  };
export const removeToken =
  (): AppThunk =>
  (dispatch) => {
    removeLocalToken();
    dispatch(setTokenInternal(null));
  };

export const selectToken = (state: RootState) => state.authentication.token;
export const selectTokenIsPresent = (state: RootState) => selectToken(state) !== null;
export const selectAuth = (state: RootState) => state.authentication;

export default authenticationSlice.reducer;
