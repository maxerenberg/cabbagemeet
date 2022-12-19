import type { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { useState, useEffect } from 'react';

// The hooks from RTK Query have really weird return types which makes it hard to
// use type inference if you try to write a wrapper for them
export type QueryWrapper<T> = {
  data?: T,
  isLoading: boolean;
  isUninitialized: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: FetchBaseQueryError | SerializedError;
};

export function getReqErrorMessage(error: FetchBaseQueryError | SerializedError): string {
  if (error.hasOwnProperty('status')) {
    if (typeof (error as FetchBaseQueryError).status === 'string') {
      return (error as FetchBaseQueryError).status as string;
    }
    if (typeof (error as FetchBaseQueryError).data === 'object') {
      if ((((error as FetchBaseQueryError).data) as any).hasOwnProperty('message')) {
        return (((error as FetchBaseQueryError).data) as any).message as string;
      }
    }
    return String((error as FetchBaseQueryError).status);
  }
  return (error as SerializedError).message || 'unknown';
}

/**
 * Returns the same values as the original mutation hook, except for the
 * error value, which will persist until a request succeeds.
 * @param mutationHook an RTK Query mutation hook
 */
export function useMutationWithPersistentError<T>(mutationHook: () => T): T {
  const [mutation, {error, ...rest}] = mutationHook() as any;
  const [lastError, setLastError] = useState<any>(undefined);
  const {isSuccess} = rest;
  useEffect(() => {
    if (error) {
      setLastError(error);
    } else if (isSuccess) {
      setLastError(undefined);
    }
  }, [error, isSuccess]);
  return [mutation, {...rest, error: lastError}] as unknown as T;
}
