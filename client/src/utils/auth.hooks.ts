import { useEffect, useRef } from "react";
import { useGetSelfInfoQuery } from "slices/api";
import {
  selectTokenIsPresent,
  setToken,
} from "slices/authentication";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { useSearchParams } from "react-router-dom";
import { getSessionNonce, removeSessionNonce } from "./auth.utils";

export function useGetSelfInfoIfTokenIsPresent() {
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const queryInfo = useGetSelfInfoQuery(undefined, {skip: !tokenIsPresent});
  return queryInfo;
}

export function useSelfInfoIsPresent(): boolean {
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const {isPresent} = useGetSelfInfoQuery(undefined, {
    skip: !tokenIsPresent,
    selectFromResult: ({data}) => ({
      isPresent: !!data
    }),
  });
  return isPresent;
}

// The server will inject a token into the URL when logging in with an OAuth2 provider.
// We need to extract it and store it.
// This function returns true iff a token query parameter is present in the current URL.
export function useExtractTokenFromQueryParams(): boolean {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  // We use a ref to avoid running the useEffect hook twice when we replace the URL
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    const token = searchParamsRef.current.get('token');
    const nonce = searchParamsRef.current.get('nonce');
    if (token === null || nonce === null) {
      return;
    }
    if (nonce === getSessionNonce()) {
      dispatch(setToken(token));
    } else {
      console.error(`nonce '${nonce}' from server did not match '${getSessionNonce()}'`);
    }
    removeSessionNonce();
    const newParams = new URLSearchParams(searchParamsRef.current);
    newParams.delete('token');
    newParams.delete('nonce');
    setSearchParams(newParams, {replace: true});
    searchParamsRef.current = newParams;
  }, [dispatch, setSearchParams]);
  return searchParams.has('token');
}
