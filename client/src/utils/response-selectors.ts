import type { TransformedMeetingResponse } from "./response-transforms"

export const selectMeetingIsScheduled =
  ({data}: {data: TransformedMeetingResponse | undefined}) =>
    data !== undefined
    && data.scheduledStartDateTime !== undefined
    && data.scheduledEndDateTime !== undefined;
