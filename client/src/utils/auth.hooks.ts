import type { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { useEffect, useRef } from "react";
import {
  useConfirmLinkGoogleAccountMutation,
  useDeleteUserMutation,
  useEditUserMutation,
  useGetSelfInfoQuery,
  useLoginMutation,
  useLogoutMutation,
  useSignupMutation,
  useUnlinkGoogleCalendarMutation,
} from "slices/api";
import type { UserResponse } from 'slices/api';
import {
  removeToken,
  selectTokenIsPresent,
  selectUserInfo,
  setToken,
  setUserInfo,
  updateUserInfo,
} from "slices/authentication";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { UserInfo } from "app/client";
import { useSearchParams } from "react-router-dom";

// TODO: use UserResponse instead of UserInfo
function UserResponseToUserInfo(data: UserResponse): UserInfo {
  return {
    userID: String(data.userID),
    name: data.name,
    email: data.email,
    hasLinkedGoogleAccount: data.hasLinkedGoogleAccount,
    isSubscribedToNotifications: data.isSubscribedToNotifications,
  };
}

export function useSignup(): ReturnType<typeof useSignupMutation> {
  const [signup, rest] = useSignupMutation();
  const dispatch = useAppDispatch();
  const {data, isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      // TODO: don't use two separate dispatches
      dispatch(setToken(data.token));
      dispatch(setUserInfo(UserResponseToUserInfo(data)));
    }
  }, [data, isSuccess, dispatch]);
  return [signup, rest];
}

export function useLogin(): ReturnType<typeof useLoginMutation> {
  const [login, rest] = useLoginMutation();
  const dispatch = useAppDispatch();
  const {data, isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      // TODO: don't use two separate dispatches
      dispatch(setToken(data.token));
      dispatch(setUserInfo(UserResponseToUserInfo(data)));
    }
  }, [data, isSuccess, dispatch]);
  return [login, rest];
}

export function useLogout(): ReturnType<typeof useLogoutMutation> {
  const [logout, rest] = useLogoutMutation();
  const dispatch = useAppDispatch();
  const {isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      // TODO: don't use two separate dispatches
      dispatch(removeToken());
      dispatch(setUserInfo(null));
    }
  }, [isSuccess, dispatch]);
  return [logout, rest];
}

export function useDeleteAccount(): ReturnType<typeof useDeleteUserMutation> {
  const [deleteUser, rest] = useDeleteUserMutation();
  const dispatch = useAppDispatch();
  const {isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      // TODO: don't use two separate dispatches
      dispatch(removeToken());
      dispatch(setUserInfo(null));
    }
  }, [isSuccess, dispatch]);
  return [deleteUser, rest];
}

export function useSelfInfo(): {
  data?: UserInfo | null,
  isSuccess: boolean,
  isError: boolean,
  error?: FetchBaseQueryError | SerializedError,
 } {
  // upsertQueryData isn't available yet as of Redux 1.8
  // Since we can't insert data into the RTK Query cache, we will store
  // the userInfo in the authentication slice instead
  const dispatch = useAppDispatch();
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const storedUserInfo = useAppSelector(selectUserInfo);
  const skip = !tokenIsPresent || storedUserInfo !== null;
  const {data, isSuccess, isError, error} = useGetSelfInfoQuery(undefined, {skip});
  useEffect(() => {
    if (isSuccess) {
      dispatch(setUserInfo(UserResponseToUserInfo(data)));
    } else if (isError) {
      dispatch(removeToken());
    }
  }, [data, isSuccess, isError, dispatch]);
  const outData = skip
    ? storedUserInfo
    : data
    ? UserResponseToUserInfo(data)
    : null;
  return {
    data: outData,
    isSuccess: isSuccess || storedUserInfo !== null,
    isError,
    error,
  };
}

export function useEditUser(): ReturnType<typeof useEditUserMutation> {
  const dispatch = useAppDispatch();
  const [editUser, rest] = useEditUserMutation();
  const {data, isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      dispatch(setUserInfo(UserResponseToUserInfo(data)));
    }
  }, [isSuccess, data, dispatch]);
  return [editUser, rest];
}

export function useUnlinkGoogleCalendar(): ReturnType<typeof useUnlinkGoogleCalendarMutation> {
  const dispatch = useAppDispatch();
  const [unlinkCalendar, rest] = useUnlinkGoogleCalendarMutation();
  const {isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      dispatch(updateUserInfo({hasLinkedGoogleAccount: false}));
    }
  }, [isSuccess, dispatch]);
  return [unlinkCalendar, rest];
}

export function useConfirmLinkGoogleAccount(): ReturnType<typeof useConfirmLinkGoogleAccountMutation> {
  const dispatch = useAppDispatch();
  const [confirm, rest] = useConfirmLinkGoogleAccountMutation();
  const {isSuccess} = rest;
  useEffect(() => {
    if (isSuccess) {
      dispatch(updateUserInfo({hasLinkedGoogleAccount: true}));
    }
  }, [isSuccess, dispatch]);
  return [confirm, rest];
}

// The server will inject a token into the URL when logging in with an OAuth2 provider.
// We need to extract it and store it.
export function useExtractTokenFromQueryParams() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  // We use a ref to avoid running the useEffect hook twice when we replace the URL
  const searchParamsRef = useRef(searchParams);
  const token = searchParams.get('token');
  useEffect(() => {
    if (token) {
      dispatch(setToken(token));
      const newParams = new URLSearchParams(searchParamsRef.current);
      newParams.delete('token');
      setSearchParams(newParams, {replace: true});
      searchParamsRef.current = newParams;
    }
  }, [token, dispatch, setSearchParams]);
}
