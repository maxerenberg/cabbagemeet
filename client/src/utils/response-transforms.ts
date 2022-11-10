import type { DateTimeSet } from 'common/types';
import { convertOtherTzToLocal, startAndEndDateTimeToDateTimesFlat } from "utils/dates.utils";
import { MeetingRespondent, MeetingsShortResponse } from "slices/api";
import type { MeetingShortResponse, MeetingResponse } from 'slices/api';
import { arrayToObject } from "./arrays.utils";

export type TransformedRespondent = {
  availabilities: DateTimeSet;
  name: string;
};
export type TransformedRespondents = {
  [userID: number]: TransformedRespondent;
};
export type TransformedMeetingResponse = Omit<
  MeetingResponse,
  'respondents' | 'timezone' | 'scheduledStartDateTime' | 'scheduledEndDateTime'
> & {
  respondents: TransformedRespondents;
  scheduledDateTimes?: DateTimeSet;
};
export type TransformedMeetingShortResponse = Omit<MeetingShortResponse, 'timezone'>;
export type TransformedMeetingsShortResponse = { meetings: TransformedMeetingShortResponse[]; };

export function transformMeetingsShortResponse(response: MeetingsShortResponse): TransformedMeetingsShortResponse {
  return {
    meetings: response.meetings.map(transformMeetingShortResponse)
  };
}

function transformMeetingShortResponse(response: MeetingShortResponse): TransformedMeetingShortResponse {
  const {timezone, ...rest} = response;
  return {
    ...rest,
    ...convertMeetingTimesAndDatesToLocal(response),
  };
}

export function transformMeetingResponse(response: MeetingResponse): TransformedMeetingResponse {
  const {timezone, respondents, scheduledStartDateTime, scheduledEndDateTime, ...rest} = response;
  return {
    ...rest,
    ...convertMeetingTimesAndDatesToLocal(response),
    respondents: transformRespondents(respondents),
    scheduledDateTimes: expandScheduledDateTimes(scheduledStartDateTime, scheduledEndDateTime),
  };
}

function convertMeetingTimesAndDatesToLocal<M extends MeetingShortResponse>(meeting: M): Pick<M, 'minStartHour' | 'maxEndHour' | 'tentativeDates'> {
  const {
    startHour: localStartHour,
    endHour: localEndHour,
    dates: localDates,
  } = convertOtherTzToLocal({
    startHour: meeting.minStartHour,
    endHour: meeting.maxEndHour,
    dates: meeting.tentativeDates,
    timezone: meeting.timezone,
  });
  return {
    minStartHour: localStartHour,
    maxEndHour: localEndHour,
    tentativeDates: localDates,
  };
}

function transformRespondents(respondents: MeetingRespondent[]): TransformedRespondents {
  const result: TransformedRespondents = {};
  for (const respondent of respondents) {
    result[respondent.respondentID] = {
      availabilities: arrayToObject(respondent.availabilities),
      name: respondent.name,
    };
  }
  return result;
}

function expandScheduledDateTimes(scheduledStartDateTime?: string, scheduledEndDateTime?: string): DateTimeSet | undefined {
  if (!scheduledStartDateTime || !scheduledEndDateTime) {
    return undefined;
  }
  return startAndEndDateTimeToDateTimeSet(scheduledStartDateTime, scheduledEndDateTime);
}

export function startAndEndDateTimeToDateTimeSet(startDateTime: string, endDateTime: string): DateTimeSet {
  return arrayToObject(startAndEndDateTimeToDateTimesFlat(startDateTime, endDateTime));
};
