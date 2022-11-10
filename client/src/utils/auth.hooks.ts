import { useEffect, useRef } from "react";
import { useGetSelfInfoQuery } from "slices/api";
import {
  selectTokenIsPresent,
  setToken,
} from "slices/authentication";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { useSearchParams } from "react-router-dom";

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
