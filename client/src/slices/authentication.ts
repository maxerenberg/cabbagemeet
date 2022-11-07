import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserInfo } from 'app/client';
import type { AppThunk, RootState } from 'app/store';
import { getLocalToken, removeLocalToken, setLocalToken } from 'utils/auth.utils';
import { assert } from 'utils/misc.utils';

export type AuthenticationState = {
  token: string | null;
  userInfo: UserInfo | null;
};

const initialState: AuthenticationState = {
  token: getLocalToken(),
  userInfo: null,
};

export const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: initialState as AuthenticationState,  // needed to prevent type narrowing
  reducers: {
    setTokenInternal: (state, {payload: token}: PayloadAction<string | null>) => {
      state.token = token;
    },
    // TODO: use UserResponse instead of UserInfo
    setUserInfo: (state, {payload}: PayloadAction<UserInfo | null>) => {
      state.userInfo = payload;
    },
    updateUserInfo: (state, {payload}: PayloadAction<Partial<Omit<UserInfo, 'userID'>>>) => {
      assert(state.userInfo !== null);
      state.userInfo = {
        ...state.userInfo,
        ...payload,
      };
    },
  },
});

export const { setUserInfo, updateUserInfo } = authenticationSlice.actions;
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
export const selectUserInfo = (state: RootState) => state.authentication.userInfo;
export const selectUserID = (state: RootState) => state.authentication.userInfo?.userID || null;
export const selectUserInfoIsPresent = (state: RootState) => state.authentication.userInfo !== null;

export default authenticationSlice.reducer;
