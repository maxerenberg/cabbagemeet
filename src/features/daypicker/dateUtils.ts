// Returns date in YYYY-MM-DD format
export function getDateString(year: number, month: number, day: number): string;
export function getDateString(date: Date): string;
export function getDateString(yearOrDate: number | Date, month?: number, day?: number): string {
  let year = yearOrDate;
  if (typeof yearOrDate !== 'number') {
    const date = yearOrDate;
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }
  return year + '-'
    + String(month).padStart(2, '0') + '-'
    + String(day).padStart(2, '0');
}

export function getDateFromString(dateString: string) {
  // dateString is in YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month-1, day);
}

export function to12HourClock(n: number) {
  return (n % 12 === 0) ? 0 : (n % 12);
}

export function getUTCOffsetHours() {
  return -(new Date().getTimezoneOffset() / 60);
}

export function addDaysToDateString(dateString: string, numDays: number) {
  const date = getDateFromString(dateString);
  date.setDate(date.getDate() + numDays);
  return getDateString(date);
}

export function getMonthAbbr(month: number) {
  return getMonthAbbrFromDate(new Date(1, month));
}

export function getMonthAbbrFromDate(date: Date) {
  return date.toDateString().split(' ', 2)[1];
}

export function getDayOfWeekAbbr(date: Date) {
  return date.toDateString().split(' ', 1)[0];
}

export function range(n: number) {
  return [...Array(n).keys()];
}

export const daysOfWeek = [
  'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
];
