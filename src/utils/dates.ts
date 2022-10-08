// change this as desired for testing etc.
export const today = new Date();
export const todayString = getDateString(today);
// from https://stackoverflow.com/a/34405528
export const tzAbbr = today.toLocaleTimeString('en-us', {timeZoneName: 'short'}).split(' ')[2];
// This is the offset from UTC time for the local time. For example, if the local
// timezone is EDT, then this would be -4.
// This value is not necessarily an integer, but it will be multiple of 0.5.
// This value must be SUBTRACTED from the local time to obtain a UTC time.
// This value must be ADDED to UTC time to obtain a local time.
export const UTCOffsetHours = -(today.getTimezoneOffset() / 60);

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
export function getDateFromString(date: string): Date {
  const [year, month, day] = getYearMonthDayFromDateString(date);
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

/**
 * Returns the three-letter abbreviation of the given month
 * @param month the month index. Must be in [0, 12)
 * @param uppercase whether the returned value should be upper case (default: true)
 */
export function getMonthAbbr(monthIdx: number, uppercase?: boolean): string {
  const abbr = months[monthIdx].substring(0, 3);
  return uppercase === false ? abbr : abbr.toUpperCase();
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
