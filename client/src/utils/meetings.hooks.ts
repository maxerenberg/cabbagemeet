import { useMemo } from "react";
import { useAppSelector } from "app/hooks";
import {
  OAuth2CalendarEventsResponseItem,
  useGetGoogleCalendarEventsQuery,
  useGetMicrosoftCalendarEventsQuery,
  useGetSelfInfoQuery,
} from "slices/api";
import { selectTokenIsPresent } from "slices/authentication";
import { selectCurrentMeetingID } from "slices/currentMeeting";
import { useGetMeetingQuery } from "slices/enhancedApi";
import { TransformedMeetingResponse } from "./response-transforms";

export function useGetCurrentMeeting() {
  const meetingID = useAppSelector(selectCurrentMeetingID);
  const queryInfo = useGetMeetingQuery(meetingID || 0, {skip: meetingID === undefined});
  return queryInfo;
}

export function useGetCurrentMeetingWithSelector<T extends Record<string, any>>(
  select: ({data}: {data?: TransformedMeetingResponse}) => T,
) {
  const meetingID = useAppSelector(selectCurrentMeetingID);
  const queryInfo = useGetMeetingQuery(meetingID ?? 0, {
    skip: meetingID === undefined,
    selectFromResult: select,
  });
  return queryInfo;
}

export function useGetExternalCalendarEventsIfTokenIsPresent(meetingID: number) {
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const {data: userInfo} = useGetSelfInfoQuery(undefined, {skip: !tokenIsPresent});
  const hasLinkedGoogleAccount = userInfo?.hasLinkedGoogleAccount || false;
  const hasLinkedMicrosoftAccount = userInfo?.hasLinkedMicrosoftAccount || false;
  const {data: googleResponse} = useGetGoogleCalendarEventsQuery(meetingID, {skip: !tokenIsPresent || !hasLinkedGoogleAccount});
  const {data: microsoftResponse} = useGetMicrosoftCalendarEventsQuery(meetingID, {skip: !tokenIsPresent || !hasLinkedMicrosoftAccount});
  const mergedEvents = useMemo(() => {
    const result: OAuth2CalendarEventsResponseItem[] = [];
    if (googleResponse) result.push(...googleResponse.events);
    if (microsoftResponse) result.push(...microsoftResponse.events);
    return result;
  }, [googleResponse, microsoftResponse]);
  return mergedEvents;
}
