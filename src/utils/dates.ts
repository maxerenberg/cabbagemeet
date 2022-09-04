// change this as desired for testing etc.
export const today = new Date();

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
  return (n % 12 === 0) ? 0 : (n % 12);
}

export function getUTCOffsetHours() {
  return -(today.getTimezoneOffset() / 60);
}

export function addDaysToDateString(dateString: string, numDays: number) {
  const date = getDateFromString(dateString);
  date.setDate(date.getDate() + numDays);
  return getDateString(date);
}

/**
 * Returns the three-letter abbreviation of the given month
 * @param month the month index. Must be in [0, 12)
 */
export function getMonthAbbr(month: number): string {
  return getMonthAbbrFromDate(new Date(1, month));
}

/**
 * Returns the three-letter abbreviation of the month of the given date
 */
export function getMonthAbbrFromDate(date: Date): string {
  return months[date.getMonth()].substring(0, 4).toUpperCase();
}

export function getDayOfWeekAbbr(date: Date) {
  return daysOfWeek[date.getDay()];
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'
];

export const daysOfWeek = [
  'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
];
