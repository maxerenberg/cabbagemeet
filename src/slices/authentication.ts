import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { SerializedError } from '@reduxjs/toolkit';
import client from 'app/client';
import type { SignupResponse, LoginResponse } from 'app/client';
import type { RootState } from 'app/store';

export type AuthenticationState = {
  userID: null;
  submitSignupFormState: 'idle' | 'pending';
  submitLoginFormState: 'idle' | 'pending';
} | {
  userID: null;
  submitSignupFormState: 'rejected';
  submitLoginFormState: 'idle';
  submitSignupFormError: SerializedError;
} | {
  userID: null;
  submitSignupFormState: 'idle';
  submitLoginFormState: 'rejected';
  submitLoginFormError: SerializedError;
} | {
  userID: string;
  name: string;
  submitSignupFormState: 'idle' | 'fulfilled';
  submitLoginFormState: 'idle' | 'fulfilled';
};

// TODO: get token (JWT?) from server, store it in LocalStorage
const initialState: AuthenticationState =
  {
    userID: null,
    submitSignupFormState: 'idle',
    submitLoginFormState: 'idle',
  }
  // {
  //   userID: '0',
  //   name: 'Max',
  //   submitSignupFormState: 'idle',
  //   submitLoginFormState: 'idle',
  // }
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

export const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: initialState as AuthenticationState,  // needed to prevent type narrowing
  reducers: {
    setAuthRequestToIdle: (state) => {
      if (state.submitSignupFormState === 'fulfilled' || state.submitLoginFormState === 'fulfilled') {
        return {
          userID: state.userID,
          name: state.name,
          submitSignupFormState: 'idle',
          submitLoginFormState: 'idle',
        };
      } else if (state.submitSignupFormState === 'rejected' || state.submitLoginFormState === 'rejected') {
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
          submitLoginFormState: 'idle',
        };
      })
      .addCase(submitSignupForm.fulfilled, (state, action) => {
        return {
          userID: action.payload.userID,
          name: action.payload.name,
          submitSignupFormState: 'fulfilled',
          submitLoginFormState: 'idle',
        };
      })
      .addCase(submitSignupForm.rejected, (state, action) => {
        return {
          userID: null,
          submitSignupFormState: 'rejected',
          submitLoginFormState: 'idle',
          submitSignupFormError: action.error,
        };
      })
      .addCase(submitLoginForm.pending, (state) => {
        return {
          userID: null,
          submitSignupFormState: 'idle',
          submitLoginFormState: 'pending',
        };
      })
      .addCase(submitLoginForm.fulfilled, (state, action) => {
        return {
          userID: action.payload.userID,
          name: action.payload.name,
          submitSignupFormState: 'idle',
          submitLoginFormState: 'fulfilled',
        };
      })
      .addCase(submitLoginForm.rejected, (state, action) => {
        return {
          userID: null,
          submitSignupFormState: 'idle',
          submitLoginFormState: 'rejected',
          submitLoginFormError: action.error,
        };
      });
  },
});

export const { setAuthRequestToIdle } = authenticationSlice.actions;

export const selectAuth = (state: RootState) => state.authentication;
export const selectIsLoggedIn = (state: RootState) => state.authentication.userID !== null;
export const selectSignupState = (state: RootState) => state.authentication.submitSignupFormState;
export const selectSignupError = (state: RootState) =>
  state.authentication.submitSignupFormState === 'rejected'
  ? state.authentication.submitSignupFormError
  : null;
export const selectLoginState = (state: RootState) => state.authentication.submitLoginFormState;
export const selectLoginError = (state: RootState) =>
  state.authentication.submitLoginFormState === 'rejected'
  ? state.authentication.submitLoginFormError
  : null;

export default authenticationSlice.reducer;
