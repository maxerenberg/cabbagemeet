import { convertOtherTzToLocal } from "utils/dates.utils";
import { MeetingsShortResponse, useGetCreatedMeetingsQuery, useGetRespondedMeetingsQuery } from "slices/api";
import type { MeetingShortResponse } from 'slices/api';
import { QueryWrapper } from "./requests.utils";

function convertMeetingTimesAndDatesToLocal(meeting: MeetingShortResponse): MeetingShortResponse {
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
    ...meeting,
    minStartHour: localStartHour,
    maxEndHour: localEndHour,
    tentativeDates: localDates,
  };
}

export function useCreatedMeetings({skip}: {skip: boolean}): QueryWrapper<MeetingsShortResponse> {
  let {data, ...rest} = useGetCreatedMeetingsQuery(undefined, {skip});
  const {isSuccess} = rest;
  if (isSuccess) {
    data = {
      meetings: data!.meetings.map(convertMeetingTimesAndDatesToLocal)
    };
  }
  return {data, ...rest};
}

export function useRespondedMeetings({skip}: {skip: boolean}): QueryWrapper<MeetingsShortResponse> {
  let {data, ...rest} = useGetRespondedMeetingsQuery(undefined, {skip});
  const {isSuccess} = rest;
  if (isSuccess) {
    data = {
      meetings: data!.meetings.map(convertMeetingTimesAndDatesToLocal)
    };
  }
  return {data, ...rest};
}
