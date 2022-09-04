import type { PeopleDateTimes, PeopleDateTimesFlat } from 'common/types';
import { arrayToObject } from 'utils/arrays';
import { addDaysToDateString } from 'utils/dates';

/**
 * Adjusts the startTime, endTime and dates by the given time zone offset.
 * @param param0.startTime The earliest meeting starting time (hours)
 * @param param0.endTime The latest meeting ending time (hours)
 * @param param0.dates The eligible meeting dates
 * @param offsetHours The offset, in hours, to add to each time
 * @returns the new values for the arguments after the offset has been added
 */
 export function addOffsetToDateTimes(
  {
    startTime,
    endTime,
    dates,
  }: {
    startTime: number,
    endTime: number,
    dates: string[],
  },
  offsetHours: number,
) {
  startTime += offsetHours;
  endTime += offsetHours;
  if (startTime < 0) {
    startTime += 24;
    // Decrement each day by 1
    dates = dates.map(date => addDaysToDateString(date, -1));
  } else if (startTime >= 24) {
    startTime -= 24;
    // Increment each day by 1
    dates = dates.map(date => addDaysToDateString(date, 1));
  }
  // Each date represents a day when each startTime can start.
  // So we don't need to update the dates if the endTime is adjusted.
  if (endTime < 0) {
    endTime += 24;
  } else if (endTime >= 24) {
    endTime -= 24;
  }

  return { startTime, endTime, dates };
}

export function PeopleDateTimesFlatToPeopleDateTimes(peopleDateTimesFlat: PeopleDateTimesFlat): PeopleDateTimes {
  const peopleDateTimes: PeopleDateTimes = {};
  for (const [person, dateTimesFlat] of Object.entries(peopleDateTimesFlat)) {
    peopleDateTimes[person] = arrayToObject(dateTimesFlat);
  }
  return peopleDateTimes;
}
