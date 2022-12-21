import { DateTime } from 'luxon';

export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

export function getSecondsSinceUnixEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

export function getUTCDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const YYYY = String(year);
  const MM = String(month).padStart(2, '0');
  const DD = String(day).padStart(2, '0');
  return `${YYYY}-${MM}-${DD}`;
}

export function oneYearAgoDateString(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return getUTCDateString(date);
}

export function oneYearFromNowDateString(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return getUTCDateString(date);
}

export function toISOStringUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  const YYYY = String(year);
  const MM = String(month).padStart(2, '0');
  const DD = String(day).padStart(2, '0');
  const HH = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const ss = '00';
  return `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}Z`;
}

export function toISOStringUTCFromDateTimeStr(dateTimeStr: string): string {
  return toISOStringUTC(new Date(dateTimeStr));
}

export function toISOStringUTCFromDateTimeStrAndTz(
  dateTimeStr: string,
  tz: string,
): string {
  const date = DateTime.fromISO(dateTimeStr, { zone: tz }).toJSDate();
  return toISOStringUTC(date);
}

export function toISOStringUTCFromDateStrAndHourAndTz(
  dateStr: string,
  hourDecimal: number,
  ianaTz: string,
): string {
  const [year, month, day] = getYearMonthDayFromDateString(dateStr);
  const hour = Math.floor(hourDecimal);
  const minute = Math.floor((hourDecimal - hour) * 60);
  const date = DateTime.fromObject(
    { year, month, day, hour, minute },
    { zone: ianaTz },
  ).toJSDate();
  return toISOStringUTC(date);
}

/**
 * Returns the year, month and day in a date string
 * @param date a date string in YYYY-MM-DD format
 * @returns [year, month, day]
 */
export function getYearMonthDayFromDateString(
  date: string,
): [number, number, number] {
  return date.split('-').map((s) => parseInt(s)) as [number, number, number];
}
