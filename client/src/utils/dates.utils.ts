import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { assert } from './misc.utils';

let today = new Date();
// For unit testing
export function setToday(date: Date) {
  today = date;
}
// Need to put this in a separate function or else we can't use it outside
// of React components
export function getToday() {
  return today;
}
export function useToday() {
  // TODO: use timer which updates `today` when midnight passes
  return getToday();
}
export function useTodayString() {
  const today = useToday();
  const todayString = useMemo(() => getDateString(today), [today]);
  return todayString;
}
// TODO: what should we show when there are two dates displayed
// with different time zones (due to Daylight Savings Time)?
export const tzAbbr = getTzAbbr(today);
// e.g. "America/Toronto"
export const ianaTzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// TODO: test Daylight Savings Time
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

export function getTzAbbr(date: Date): string {
  // from https://stackoverflow.com/a/34405528
  return date.toLocaleTimeString('en-us', {timeZoneName: 'short'}).split(' ')[2];
}

// This is the offset from UTC time for the local time. For example, if the local
// timezone is EDT, then this would be -4.
// This value is not necessarily an integer, but it will be a multiple of 0.25.
// This value must be SUBTRACTED from the local time to obtain a UTC time.
// This value must be ADDED to UTC time to obtain a local time.
// TODO: only accept a Date
export function getUTCOffsetHours(date: Date | string): number {
  if (typeof date === 'string') {
    date = getDateFromString(date);
  }
  return -(date.getTimezoneOffset() / 60);
}

/**
 * Returns date in YYYY-MM-DD format
 * @param year current year
 * @param month current month number. Must be between [1, 12].
 * @param day current day number. Must be between [1, 31].
 */
export function getDateString(year: number, month: number, day: number): string;
/**
 * Returns date in YYYY-MM-DD format
 * @param date the date to be formatted
 */
export function getDateString(date: Date): string;
export function getDateString(yearOrDate: number | Date, month?: number, day?: number): string {
  let year: number | undefined;
  if (typeof yearOrDate !== 'number') {
      const date = yearOrDate;
      year = date.getFullYear();
      month = date.getMonth() + 1;
      day = date.getDate();
  } else {
      year = yearOrDate;
  }
  const YYYY = String(year);
  const MM = String(month).padStart(2, '0');
  const DD = String(day).padStart(2, '0');
  return `${YYYY}-${MM}-${DD}`;
}

/**
 * Returns a date object for the given date string in local time
 * @param date a date string in YYYY-MM-DD format
 */
export function getDateFromString(dateStr: string): Date {
  // Do not pass the dateStr directly to the Date constructor, because
  // that will assume midnight at UTC, which, if you're in the Western
  // hemisphere, will actually be yesterday in local time
  const [year, month, day] = getYearMonthDayFromDateString(dateStr);
  return new Date(year, month-1, day);
}

export function customToISOString(date: Date): string;
export function customToISOString(dateString: string, hour: number, minute: number): string;
export function customToISOString(date: Date | string, hour?: number, minute?: number): string {
  if (typeof date === 'string') {
    // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date:
    // "date-time strings (e.g. "1970-01-01T12:00") are treated as local"
    const HH = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    const ss = '00';
    date = new Date(`${date}T${HH}:${mm}:${ss}`);  // in local time
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  hour = date.getUTCHours();
  minute = date.getUTCMinutes();

  const YYYY = String(year);
  const MM = String(month).padStart(2, '0');
  const DD = String(day).padStart(2, '0');
  const HH = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const ss = '00';
  return `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}Z`;
}

/**
 * Returns the year, month and day in a date string
 * @param date a date string in YYYY-MM-DD format
 * @returns [year, month, day]
 */
export function getYearMonthDayFromDateString(date: string): [number, number, number] {
  return date.split('-').map(s => parseInt(s)) as [number, number, number];
}

export function getLocalYearMonthDayFromDate(date: Date): [number, number, number] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

export function to12HourClock(n: number) {
  return (n === 0 || n === 12) ? 12 : (n % 12);
}

export function floorTowardsZero(val: number): number {
  if (val < 0) {
    return -Math.floor(Math.abs(val));
  }
  return Math.floor(val);
}

export function addDaysToDateString(dateString: string, numDays: number): string {
  const date = getDateFromString(dateString);
  date.setDate(date.getDate() + numDays);
  return getDateString(date);
}

/**
 * Adds the specified number of minutes to the datetime string
 * @param dateTime a UTC datetime string formatted as YYYY-MM-DDTHH:MM:ssZ
 * @param numMinutes the number of minutes to add
 * @returns a new datetime string
 */
export function addMinutesToDateTimeString(dateTime: string, numMinutes: number): string {
  const date = new Date(dateTime);
  date.setMinutes(date.getMinutes() + numMinutes);
  return customToISOString(date);
}

export function convertDateTimeStringToHourDecimal(dateTime: string): number {
  const date = new Date(dateTime);
  return date.getHours() + date.getMinutes() / 60;
}

export function convertOtherTzToLocal(
  {
    startHour,
    endHour,
    dates,
    timezone,
  }: {
    startHour: number,  // can be a decimal
    endHour: number,  // can be a decimal
    dates: string[],  // YYYY-MM-DD
    timezone: string,  // e.g. "America/Toronto"
  },
) {
  // copy
  dates = [...dates];
  dates.sort();
  // I only see one reasonable option to convert the startHour and endHour
  // to local time, and that is to take the TZ offset of the first date.
  // Unfortunately this will give incorrect start/end times if e.g. the person
  // who created the meeting follows DST, but the current user does not.
  // I don't think there's anything we can do in that scenario. :/

  const [year, month, day] = getYearMonthDayFromDateString(dates[0]);
  const hour = Math.floor(startHour);
  const minute = (startHour - hour) * 60;
  assert(Number.isInteger(minute));
  const dt = DateTime.fromObject({year, month, day, hour, minute}, {zone: timezone});
  assert(dt.isValid);
  const offsetHours = getUTCOffsetHours(getDateFromString(dates[0])) - dt.offset / 60;
  startHour += offsetHours;
  endHour += offsetHours;
  if (startHour < 0) {
    startHour += 24;
    // Decrement each day by 1
    dates = dates.map(date => addDaysToDateString(date, -1));
  } else if (startHour >= 24) {
    startHour -= 24;
    // Increment each day by 1
    dates = dates.map(date => addDaysToDateString(date, 1));
  }
  // Each date represents a day when each startTime can start.
  // So we don't need to update the dates if the endTime is adjusted.
  if (endHour < 0) {
    endHour += 24;
  } else if (endHour >= 24) {
    endHour -= 24;
  }

  return { startHour, endHour, dates };
}

function roundDownDate(date: Date) {
  if (date.getUTCMinutes() > 30) {
    date.setUTCMinutes(30);
  } else if (0 < date.getUTCMinutes() && date.getUTCMinutes() < 30) {
    date.setUTCMinutes(0);
  }
}

export function roundDownDateTimeStr(dateTime: string): string {
  const date = new Date(dateTime);
  roundDownDate(date);
  return customToISOString(date);
}

/**
 * Returns a sorted array of the starting times of the 30-minute intervals between
 * [startDateTime, endDateTime).
 *
 * WARNING: startDateTime will be rounded down to the start of the closest 30-minute interval
 *
 * e.g. startAndEndDateTimeToDateTimesFlat('2022-10-10T14:00:00Z', '2022-10-10T15:30:00Z')
 *      => ['2022-10-10T14:00:00Z', '2022-10-10T14:30:00Z', '2022-10-10T15:00:00Z']
 * @param startDateTime YYYY-MM-DDTHH:mm:ssZ
 * @param endDateTime YYYY-MM-DDTHH:mm:ssZ
 */
 export function startAndEndDateTimeToDateTimesFlat(startDateTime: string, endDateTime: string): string[] {
  assert(startDateTime <= endDateTime);
  const date = new Date(startDateTime);
  roundDownDate(date);
  const result: string[] = [];
  for (
    let dateTime = customToISOString(date);
    dateTime < endDateTime;
    date.setUTCMinutes(date.getUTCMinutes() + 30), dateTime = customToISOString(date)
  ) {
    result.push(dateTime);
  }
  return result;
};

export function getFractionalHourFromDateInLocalTime(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

/**
 * Returns the three-letter abbreviation of the given month
 * @param month the month index. Must be in [0, 12)
 * @param uppercase whether the returned value should be upper case (default: true)
 */
export function getMonthAbbr(monthIdx: number, uppercase: boolean = true): string {
  const abbr = months[monthIdx].substring(0, 3);
  return uppercase ? abbr : abbr.toUpperCase();
}

/**
 * Returns the three-letter abbreviation of the month of the given date
 */
export function getMonthAbbrFromDate(date: Date): string {
  return getMonthAbbr(date.getMonth());
}

export function getDayOfWeekAbbr(date: Date) {
  return daysOfWeekAbbr[date.getDay()];
}

export const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'
];

export const daysOfWeek = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export const daysOfWeekAbbr = daysOfWeek.map(day => day.substring(0, 3).toUpperCase());
