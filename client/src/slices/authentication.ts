import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { SerializedError } from '@reduxjs/toolkit';
import client, { GetSelfInfoResponse } from 'app/client';
import type {
  UserInfo,
  SignupResponse,
  LoginResponse,
  EditNameResponse,
  DeleteAccountResponse,
  LogoutResponse,
  SubscribeToNotificationsResponse,
  UnlinkGoogleCalendarResponse,
} from 'app/client';
import type { RootState } from 'app/store';
import { assert } from 'utils/misc';
import type { RequestStatus } from 'common/types';

export type AuthenticationState = {
  userInfo: UserInfo | null;
  getSelfInfoState: RequestStatus;
  getSelfInfoError: SerializedError | null;
  loginState: RequestStatus;
  loginError: SerializedError | null;
  signupState: RequestStatus;
  signupError: SerializedError | null;
  logoutState: RequestStatus;
  logoutError: SerializedError | null;
  editNameState: RequestStatus;
  editNameError: SerializedError | null;
  subscribeToNotificationsState: RequestStatus;
  subscribeToNotificationsError: SerializedError | null;
  unlinkGoogleCalendarState: RequestStatus;
  unlinkGoogleCalendarError: SerializedError | null;
  deleteAccountState: RequestStatus;
  deleteAccountError: SerializedError | null;
};

const initialState: AuthenticationState = {
  userInfo: null,
  getSelfInfoState: 'idle',
  getSelfInfoError: null,
  loginState: 'idle',
  loginError: null,
  signupState: 'idle',
  signupError: null,
  logoutState: 'idle',
  logoutError: null,
  editNameState: 'idle',
  editNameError: null,
  subscribeToNotificationsState: 'idle',
  subscribeToNotificationsError: null,
  unlinkGoogleCalendarState: 'idle',
  unlinkGoogleCalendarError: null,
  deleteAccountState: 'idle',
  deleteAccountError: null,
};

export const getSelfInfo = createAsyncThunk<GetSelfInfoResponse>(
  'authentication/getSelfInfo',
  () => client.getSelfInfo()
);

type signupInfo = {
  name: string;
  email: string;
  password: string;
};

export const submitSignupForm = createAsyncThunk<SignupResponse, signupInfo>(
  'authentication/submitSignupForm',
  ({ name, email, password }) => client.signup(name, email, password)
);

type loginInfo = {
  email: string;
  password: string;
};

export const submitLoginForm = createAsyncThunk<LoginResponse, loginInfo>(
  'authentication/submitLoginForm',
  ({ email, password }) => client.login(email, password)
);

// TODO: reset meetingTimes, createdMeetings, respondedMeetings
export const submitLogout = createAsyncThunk<LogoutResponse, void>(
  'authentication/submitLogout',
  () => client.logout()
);

export const editName = createAsyncThunk<EditNameResponse, string>(
  'authentication/editName',
  (newName: string) => client.editName(newName)
);

export const subscribeToNotifications = createAsyncThunk<SubscribeToNotificationsResponse, boolean>(
  'authentication/subscribeToNotifications',
  (subscribe: boolean) => client.subscribeToNotifications(subscribe)
);

export const deleteAccount = createAsyncThunk<DeleteAccountResponse>(
  'authentication/deleteAccount',
  () => client.deleteAccount()
);

export const unlinkGoogleCalendar = createAsyncThunk<UnlinkGoogleCalendarResponse>(
  'authentication/unlinkGoogleCalendar',
  () => client.unlinkGoogleCalendar()
);

export const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: initialState as AuthenticationState,  // needed to prevent type narrowing
  reducers: {
    setAuthRequestToIdle: (state) => {
      if (state.loginState === 'failed') {
        state.loginState = 'idle';
        state.loginError = null;
      } else if (state.signupState === 'failed') {
        state.signupState = 'idle';
        state.signupError = null;
      } else if (state.logoutState === 'failed') {
        state.logoutState = 'idle';
        state.logoutError = null;
      } else if (state.logoutState === 'succeeded') {
        state.loginState = 'idle';
        state.signupState = 'idle';
        state.logoutState = 'idle';
        state.userInfo = null;
      } else {
        throw new Error();
      }
    },
    resetEditNameStatus: (state) => {
      state.editNameState = 'idle';
      state.editNameError = null;
    },
    resetSubscribeToNotificationsStatus: (state) => {
      state.subscribeToNotificationsState = 'idle';
      state.subscribeToNotificationsError = null;
    },
    resetUnlinkGoogleCalendarStatus: (state) => {
      state.unlinkGoogleCalendarState = 'idle';
      state.unlinkGoogleCalendarError = null;
    },
    resetDeleteAccountStatus: (state) => {
      if (state.deleteAccountState === 'succeeded') {
        state.deleteAccountState = 'idle';
        state.loginState = 'idle';
        state.signupState = 'idle';
        state.userInfo = null;
      } else if (state.deleteAccountState === 'failed') {
        state.deleteAccountState = 'idle';
        state.deleteAccountError = null;
      } else {
        throw new Error();
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSelfInfo.pending, (state) => {
        state.getSelfInfoState = 'loading';
      })
      .addCase(getSelfInfo.fulfilled, (state, {payload}) => {
        if (payload !== null) {
          state.userInfo = payload;
        }
        state.getSelfInfoState = 'succeeded';
      })
      .addCase(getSelfInfo.rejected, (state, action) => {
        state.getSelfInfoState = 'failed';
        state.getSelfInfoError = action.error;
      })
      .addCase(submitSignupForm.pending, (state) => {
        state.signupState = 'loading';
      })
      .addCase(submitSignupForm.fulfilled, (state, {payload}) => {
        state.userInfo = payload;
        state.signupState = 'succeeded';
      })
      .addCase(submitSignupForm.rejected, (state, action) => {
        state.signupState = 'failed';
        state.signupError = action.error;
      })
      .addCase(submitLoginForm.pending, (state) => {
        state.loginState = 'loading';
      })
      .addCase(submitLoginForm.fulfilled, (state, {payload}) => {
        state.userInfo = payload;
        state.loginState = 'succeeded';
      })
      .addCase(submitLoginForm.rejected, (state, action) => {
        state.loginState = 'failed';
        state.loginError = action.error;
      })
      .addCase(submitLogout.pending, (state) => {
        state.logoutState = 'loading';
      })
      .addCase(submitLogout.fulfilled, (state) => {
        state.logoutState = 'succeeded';
      })
      .addCase(submitLogout.rejected, (state, action) => {
        state.logoutState = 'failed';
        state.logoutError = action.error;
      })
      .addCase(editName.pending, (state) => {
        state.editNameState = 'loading';
      })
      .addCase(editName.fulfilled, (state, action) => {
        assert(state.userInfo !== null);
        state.editNameState = 'succeeded';
        state.userInfo.name = action.meta.arg;
      })
      .addCase(editName.rejected, (state, action) => {
        state.editNameState = 'failed';
        state.editNameError = action.error;
      })
      .addCase(subscribeToNotifications.pending, (state) => {
        state.subscribeToNotificationsState = 'loading';
      })
      .addCase(subscribeToNotifications.fulfilled, (state, action) => {
        assert(state.userInfo !== null);
        state.subscribeToNotificationsState = 'succeeded';
        state.userInfo.isSubscribedToNotifications = action.meta.arg;
      })
      .addCase(subscribeToNotifications.rejected, (state, action) => {
        state.subscribeToNotificationsState = 'failed';
        state.subscribeToNotificationsError = action.error;
      })
      .addCase(unlinkGoogleCalendar.pending, (state) => {
        state.unlinkGoogleCalendarState = 'loading';
      })
      .addCase(unlinkGoogleCalendar.fulfilled, (state) => {
        assert(state.userInfo !== null);
        state.unlinkGoogleCalendarState = 'succeeded';
        state.userInfo.hasLinkedGoogleAccount = false;
      })
      .addCase(unlinkGoogleCalendar.rejected, (state, action) => {
        state.unlinkGoogleCalendarState = 'failed';
        state.unlinkGoogleCalendarError = action.error;
      })
      .addCase(deleteAccount.pending, (state) => {
        state.deleteAccountState = 'loading';
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.deleteAccountState = 'succeeded';
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.deleteAccountState = 'failed';
        state.deleteAccountError = action.error;
      });
  },
});

export const {
  setAuthRequestToIdle,
  resetEditNameStatus,
  resetSubscribeToNotificationsStatus,
  resetUnlinkGoogleCalendarStatus,
  resetDeleteAccountStatus,
} = authenticationSlice.actions;

export const selectAuth = (state: RootState) => state.authentication;
export const selectUserInfo = (state: RootState) => state.authentication.userInfo;
export const selectUserID = (state: RootState) => state.authentication.userInfo?.userID || null;
export const selectGetSelfInfoState = (state: RootState) => state.authentication.getSelfInfoState;
export const selectGetSelfInfoError = (state: RootState) => state.authentication.getSelfInfoError;
export const selectIsLoggedIn = (state: RootState) => state.authentication.userInfo !== null;
export const selectSignupState = (state: RootState) => state.authentication.signupState;
export const selectSignupError = (state: RootState) => state.authentication.signupError;
export const selectLoginState = (state: RootState) => state.authentication.loginState;
export const selectLoginError = (state: RootState) => state.authentication.loginError;
export const selectLogoutState = (state: RootState) => state.authentication.logoutState;
export const selectLogoutError = (state: RootState) => state.authentication.logoutError;
export const selectEditNameState = (state: RootState) => state.authentication.editNameState;
export const selectEditNameError = (state: RootState) => state.authentication.editNameError;
export const selectSubscribeToNotificationsState = (state: RootState) => state.authentication.subscribeToNotificationsState;
export const selectSubscribeToNotificationsError = (state: RootState) => state.authentication.subscribeToNotificationsError;
export const selectDeleteAccountState = (state: RootState) => state.authentication.deleteAccountState;
export const selectDeleteAccountError = (state: RootState) => state.authentication.deleteAccountError;
export const selectUnlinkGoogleCalendarState = (state: RootState) => state.authentication.unlinkGoogleCalendarState;
export const selectUnlinkGoogleCalendarError = (state: RootState) => state.authentication.unlinkGoogleCalendarError;

export default authenticationSlice.reducer;
