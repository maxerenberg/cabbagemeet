import { useAppSelector } from "app/hooks";
import { useGetGoogleCalendarEventsQuery, useGetSelfInfoQuery } from "slices/api";
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

export function useGetGoogleCalendarEventsIfTokenIsPresent(meetingID: number) {
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const {data: userInfo} = useGetSelfInfoQuery(undefined, {skip: !tokenIsPresent});
  const hasLinkedGoogleAccount = userInfo?.hasLinkedGoogleAccount || false;
  const queryInfo = useGetGoogleCalendarEventsQuery(meetingID, {skip: !tokenIsPresent || !hasLinkedGoogleAccount});
  return queryInfo;
}
