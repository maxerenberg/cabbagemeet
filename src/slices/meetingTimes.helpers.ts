import type { ExternalCalendarEvent } from 'app/client';
import type { DateTimeSet, PeopleDateTimes, PeopleDateTimesFlat } from 'common/types';
import { arrayToObject } from 'utils/arrays';
import { addMinutesToDateTimeString } from 'utils/dates';
import { assert } from 'utils/misc';
import type { ExternalCalendarEventWithDateTimes } from './meetingTimes';

/**
 * Returns a sorted array of the starting times of the 30-minute intervals between
 * [startDateTime, endDateTime).
 *
 * e.g. startAndEndDateTimeToDateTimesFlat('2022-10-10T14:00:00Z', '2022-10-10T15:30:00Z')
 *      => ['2022-10-10T14:00:00Z', '2022-10-10T14:30:00Z', '2022-10-10T15:00:00Z']
 * @param startDateTime YYYY-MM-DDTHH:mm:ssZ
 * @param endDateTime YYYY-MM-DDTHH:mm:ssZ
 */
export function startAndEndDateTimeToDateTimesFlat(startDateTime: string, endDateTime: string): string[] {
  assert(startDateTime <= endDateTime);
  const result: string[] = [];
  for (let dateTime = startDateTime; dateTime < endDateTime; dateTime = addMinutesToDateTimeString(dateTime, 30)) {
    result.push(dateTime);
  }
  return result;
};

export function startAndEndDateTimeToDateTimeSet(startDateTime: string, endDateTime: string): DateTimeSet {
  return arrayToObject(startAndEndDateTimeToDateTimesFlat(startDateTime, endDateTime));
};

export function PeopleDateTimesFlatToPeopleDateTimes(peopleDateTimesFlat: PeopleDateTimesFlat): PeopleDateTimes {
  const peopleDateTimes: PeopleDateTimes = {};
  for (const [person, dateTimesFlat] of Object.entries(peopleDateTimesFlat)) {
    peopleDateTimes[person] = arrayToObject(dateTimesFlat);
  }
  return peopleDateTimes;
};

export function ExternalCalendarEventsToExternalCalendarEventsWithDateTimes(events: ExternalCalendarEvent[]): ExternalCalendarEventWithDateTimes[] {
  return events.map(event => {
    const dateTimes = startAndEndDateTimeToDateTimesFlat(event.startDateTime, event.endDateTime);
    return {name: event.name, dateTimes};
  });
};
