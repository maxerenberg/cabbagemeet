import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { SerializedError } from '@reduxjs/toolkit';
import client from 'app/client';
import type { ResetPasswordResponse } from 'app/client';
import type { RootState } from 'app/store';

export type ResetPasswordState = {
  requestStatus: 'idle' | 'pending' | 'fulfilled';
} | {
  requestStatus: 'rejected';
  error: SerializedError;
};

const initialState: ResetPasswordState = {
  requestStatus: 'idle',
};

type resetPasswordInfo = {
  email: string;
};

export const resetPassword = createAsyncThunk<ResetPasswordResponse, resetPasswordInfo>(
  'resetPassword/submit',
  async ({ email }) => {
    return await client.resetPassword(email);
  }
);

export const resetPasswordSlice = createSlice({
  name: 'resetPassword',
  initialState: initialState as ResetPasswordState,
  reducers: {
    setResetPasswordStateToIdle: (state) => {
      return {
        requestStatus: 'idle',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(resetPassword.pending, (state) => {
        return {
          requestStatus: 'pending',
        };
      })
      .addCase(resetPassword.fulfilled, (state) => {
        return {
          requestStatus: 'fulfilled',
        };
      })
      .addCase(resetPassword.rejected, (state, action) => {
        return {
          requestStatus: 'rejected',
          error: action.error,
        };
      });
  }
});

export const { setResetPasswordStateToIdle } = resetPasswordSlice.actions;

export const selectResetPasswordState = (state: RootState) => state.resetPassword.requestStatus;
export const selectResetPasswordError = (state: RootState) =>
  state.resetPassword.requestStatus === 'rejected'
  ? state.resetPassword.error
  : null;

export default resetPasswordSlice.reducer;
