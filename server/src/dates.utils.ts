import { DateTime } from 'luxon';

export function getSecondsSinceUnixEpoch(): number {
  return Math.floor(Date.now() / 1000);
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

/**
 * Returns the year, month and day in a date string
 * @param date a date string in YYYY-MM-DD format
 * @returns [year, month, day]
 */
 export function getYearMonthDayFromDateString(date: string): [number, number, number] {
  return date.split('-').map(s => parseInt(s)) as [number, number, number];
}

export function toISOStringWithTz(dateStr: string, hourDecimal: number, ianaTz: string): string {
  const [year, month, day] = getYearMonthDayFromDateString(dateStr);
  const hour = Math.floor(hourDecimal);
  const minute = Math.floor((hourDecimal - hour) * 60);
  return DateTime.fromObject(
    {
      year,
      month,
      day,
      hour,
      minute,
    },
    {
      zone: ianaTz
    }
  ).toISO();
}
