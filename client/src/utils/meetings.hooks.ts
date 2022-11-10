import { useAppSelector } from "app/hooks";
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
