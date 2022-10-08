import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import type { SerializedError } from '@reduxjs/toolkit';
import client, { LogoutResponse } from 'app/client';
import type { SignupResponse, LoginResponse } from 'app/client';
import type { RootState } from 'app/store';
import { assert } from 'utils/misc';

type UserInfo = {
  userID: string;
  name: string;
};

type NoUserID = {
  userID: null;
}

type NotLoggedIn = NoUserID & {
  submitSignupFormState: 'idle';
  submitLoginFormState: 'idle';
};

type SubmittingSignupForm = NoUserID & {
  submitSignupFormState: 'pending';
};

type SubmittingLoginForm = NoUserID & {
  submitLoginFormState: 'pending';
};

type RejectedSignupForm = NoUserID & {
  submitSignupFormState: 'rejected';
  submitSignupFormError: SerializedError;
};

type RejectedLoginForm = NoUserID & {
  submitLoginFormState: 'rejected';
  submitLoginFormError: SerializedError;
};

type SubmittedSignupForm = UserInfo & {
  submitSignupFormState: 'fulfilled';
};

type SubmittedLoginForm = UserInfo & {
  submitLoginFormState: 'fulfilled';
};

type LoggedIn = UserInfo & {
  submitLogoutState: 'idle';
};

type SubmittingLogout = UserInfo & {
  submitLogoutState: 'pending';
};

type SubmittedLogout = UserInfo & {
  submitLogoutState: 'fulfilled';
};

type RejectedLogout = UserInfo & {
  submitLogoutState: 'rejected';
  submitLogoutError: SerializedError;
}

export type AuthenticationState =
  NotLoggedIn
  | SubmittingSignupForm
  | SubmittingLoginForm
  | RejectedSignupForm
  | RejectedLoginForm
  | SubmittedSignupForm
  | SubmittedLoginForm
  | LoggedIn
  | SubmittingLogout
  | SubmittedLogout
  | RejectedLogout;

function stateHasSignupForm(state: AuthenticationState): state is
  NotLoggedIn | SubmittingSignupForm | RejectedSignupForm | SubmittedSignupForm
{
  return state.hasOwnProperty('submitSignupFormState');
}

function stateHasLoginForm(state: AuthenticationState): state is
  NotLoggedIn | SubmittingLoginForm | RejectedLoginForm | SubmittedLoginForm
{
  return state.hasOwnProperty('submitLoginFormState');
}

function stateHasLogout(state: AuthenticationState): state is
  LoggedIn | SubmittingLogout | RejectedLogout | SubmittedLogout
{
  return state.hasOwnProperty('submitLogoutState');
}

function stateIsJustLoggedIn(state: AuthenticationState): state is SubmittedLoginForm {
  return (state as any).submitLoginFormState === 'fulfilled';
}

function stateIsJustSignedUp(state: AuthenticationState): state is SubmittedSignupForm {
  return (state as any).submitSignupFormState === 'fulfilled';
}

function stateIsJustFailedToLogIn(state: AuthenticationState): state is RejectedLoginForm {
  return (state as any).submitLoginFormState === 'rejected';
}

function stateIsJustFailedToSignUp(state: AuthenticationState): state is RejectedSignupForm {
  return (state as any).submitSignupFormState === 'rejected';
}

function stateIsLoggedIn(state: AuthenticationState): state is LoggedIn {
  return (state as any).submitLogoutState === 'idle';
}

function stateIsLoggingOut(state: AuthenticationState): state is SubmittingLogout {
  return (state as any).submitLogoutState === 'pending';
}

function stateIsJustLoggedOut(state: AuthenticationState): state is SubmittedLogout {
  return (state as any).submitLogoutState === 'fulfilled';
}

function stateIsJustFailedToLogOut(state: AuthenticationState): state is RejectedLogout {
  return (state as any).submitLogoutState === 'rejected';
}

// TODO: get token (JWT?) from server, store it in LocalStorage
const initialState: AuthenticationState =
  // {
  //   userID: null,
  //   submitSignupFormState: 'idle',
  //   submitLoginFormState: 'idle',
  // }
  {
    userID: 'bob123',
    name: 'Bob',
    submitLogoutState: 'idle',
  }
  ;

type signupInfo = {
  name: string;
  email: string;
  password: string;
};

export const submitSignupForm = createAsyncThunk<SignupResponse, signupInfo>(
  'authentication/submitSignupForm',
  async ({ name, email, password }) => {
    return await client.signup(name, email, password);
  }
);

type loginInfo = {
  email: string;
  password: string;
};

export const submitLoginForm = createAsyncThunk<LoginResponse, loginInfo>(
  'authentication/submitLoginForm',
  async ({ email, password }) => {
    return await client.login(email, password);
  }
);

export const submitLogout = createAsyncThunk<LogoutResponse, void>(
  'authentication/submitLogout',
  async () => {
    return await client.logout();
  }
);

export const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: initialState as AuthenticationState,  // needed to prevent type narrowing
  reducers: {
    setAuthRequestToIdle: (state) => {
      if (stateIsJustLoggedIn(state) || stateIsJustSignedUp(state) || stateIsJustFailedToLogOut(state)) {
        return {
          userID: state.userID,
          name: state.name,
          submitLogoutState: 'idle',
        };
      } else if (stateIsJustFailedToLogIn(state) || stateIsJustFailedToSignUp(state) || stateIsJustLoggedOut(state)) {
        return {
          userID: null,
          submitSignupFormState: 'idle',
          submitLoginFormState: 'idle',
        }
      } else {
        throw new Error();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitSignupForm.pending, (state) => {
        return {
          userID: null,
          submitSignupFormState: 'pending',
        };
      })
      .addCase(submitSignupForm.fulfilled, (state, action) => {
        return {
          userID: action.payload.userID,
          name: action.payload.name,
          submitSignupFormState: 'fulfilled',
        };
      })
      .addCase(submitSignupForm.rejected, (state, action) => {
        return {
          userID: null,
          submitSignupFormState: 'rejected',
          submitSignupFormError: action.error,
        };
      })
      .addCase(submitLoginForm.pending, (state) => {
        return {
          userID: null,
          submitLoginFormState: 'pending',
        };
      })
      .addCase(submitLoginForm.fulfilled, (state, action) => {
        return {
          userID: action.payload.userID,
          name: action.payload.name,
          submitLoginFormState: 'fulfilled',
        };
      })
      .addCase(submitLoginForm.rejected, (state, action) => {
        return {
          userID: null,
          submitLoginFormState: 'rejected',
          submitLoginFormError: action.error,
        };
      })
      .addCase(submitLogout.pending, (state) => {
        assert(stateIsLoggedIn(state));
        return {
          ...state,
          submitLogoutState: 'pending',
        };
      })
      .addCase(submitLogout.fulfilled, (state) => {
        assert(stateIsLoggingOut(state));
        return {
          ...state,
          submitLogoutState: 'fulfilled',
        };
      })
      .addCase(submitLogout.rejected, (state, action) => {
        assert(stateIsLoggingOut(state));
        return {
          ...state,
          submitLogoutState: 'rejected',
          submitLogoutError: action.error,
        };
      });
  },
});

export const { setAuthRequestToIdle } = authenticationSlice.actions;

export const selectAuth = (state: RootState) => state.authentication;
export const selectUserID = (state: RootState) => state.authentication.userID;
export const selectIsLoggedIn = (state: RootState) => state.authentication.userID !== null;
export const selectSignupState = createSelector(
  [selectAuth],
  (state) => stateHasSignupForm(state) ? state.submitSignupFormState : null
);
export const selectSignupError = createSelector(
  [selectAuth],
  (state) => stateIsJustFailedToSignUp(state) ? state.submitSignupFormError : null
);
export const selectLoginState = createSelector(
  [selectAuth],
  (state) => stateHasLoginForm(state) ? state.submitLoginFormState : null
);
export const selectLoginError = createSelector(
  [selectAuth],
  (state) => stateIsJustFailedToLogIn(state) ? state.submitLoginFormError : null
);
export const selectLogoutState = createSelector(
  [selectAuth],
  (state) => stateHasLogout(state) ? state.submitLogoutState : null
);
export const selectLogoutError = createSelector(
  [selectAuth],
  (state) => stateIsJustFailedToLogOut(state) ? state.submitLogoutError : null
);

export default authenticationSlice.reducer;
