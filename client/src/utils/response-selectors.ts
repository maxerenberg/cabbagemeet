import type { TransformedMeetingResponse } from "./response-transforms"

export const selectScheduledDateTimes =
  ({data}: {data: TransformedMeetingResponse | undefined}) => data?.scheduledDateTimes || {};
export const selectMeetingIsScheduled =
  ({data}: {data: TransformedMeetingResponse | undefined}) => !!data?.scheduledDateTimes;
