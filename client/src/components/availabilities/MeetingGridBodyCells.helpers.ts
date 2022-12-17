import type { OAuth2CalendarEventsResponseItem } from "slices/api";
import { customToISOString, getFractionalHourFromDateInLocalTime, startAndEndDateTimeToDateTimesFlat } from "utils/dates.utils";
import { assert } from "utils/misc.utils";

type ExternalEventInfoWithColStart = OAuth2CalendarEventsResponseItem & {
  colStart: number;  // grid-column-start (starts from 1)
};
export type ExternalEventInfoWithNumCols = {
  events: ExternalEventInfoWithColStart[];
  numCols: number;  // grid-template-columns
};
export type ExternalEventInfosWithNumCols = {
  [dateTime: string]: ExternalEventInfoWithNumCols;
};

// !!!!!!!!!!!!!!!!!
// FIXME: properly show events which span multiple days
//        (as of this writing, LettuceMeet has the same bug)
// !!!!!!!!!!!!!!!!!
function adjustExternalEventTimesToFitInGrid(
  externalEvents: OAuth2CalendarEventsResponseItem[],
  minStartHour: number,  // can be a decimal
  maxEndHour: number,    // can be a decimal
) {
  const minStartHour_int = Math.floor(minStartHour);
  const minStartHour_minutes = (minStartHour - minStartHour_int) * 60;
  const maxEndHour_int = Math.floor(maxEndHour);
  const maxEndHour_minutes = (maxEndHour - maxEndHour_int) * 60;
  for (let i = 0; i < externalEvents.length; i++) {
    const externalEvent = externalEvents[i];
    const startDate = new Date(externalEvent.startDateTime);
    if (getFractionalHourFromDateInLocalTime(startDate) < minStartHour) {
      startDate.setHours(minStartHour_int);
      startDate.setMinutes(minStartHour_minutes);
      // externalEvent is immutable (probably done by RTK Query), so we need to
      // create a new object
      externalEvents[i] = {...externalEvent, startDateTime: customToISOString(startDate)};
    }
    const endDate = new Date(externalEvent.endDateTime);
    if (getFractionalHourFromDateInLocalTime(endDate) > maxEndHour) {
      endDate.setHours(maxEndHour_int);
      endDate.setMinutes(maxEndHour_minutes);
      // Make sure to use externalEvents[i] inside the spread statement
      // in case we modified the array entry previously
      externalEvents[i] = {...externalEvents[i], endDateTime: customToISOString(endDate)};
    }
  }
}

// This isn't a very efficient layout algorithm, but at least it won't cause
// the external event boxes to overlap with each other.
export function calculateExternalEventInfoColumns(
  externalEvents: OAuth2CalendarEventsResponseItem[],
  minStartHour: number,  // can be a decimal
  maxEndHour: number,    // can be a decimal
): ExternalEventInfosWithNumCols {
  if (externalEvents === undefined) {
    return {};
  }
  // sanity check - make sure events are sorted by start date (should be done by server)
  assert(externalEvents.every(
    (_, i) => i === externalEvents.length - 1
              || externalEvents[i].startDateTime <= externalEvents[i+1].startDateTime
  ));
  // Just in case there are out-of-bounds events, filter them out
  externalEvents = externalEvents.filter(
    ({startDateTime, endDateTime}) =>
      getFractionalHourFromDateInLocalTime(new Date(endDateTime)) > minStartHour
      && getFractionalHourFromDateInLocalTime(new Date(startDateTime)) < maxEndHour
  );
  // Adjust start/end times if necessary so that they are inside the grid boundaries
  adjustExternalEventTimesToFitInGrid(externalEvents, minStartHour, maxEndHour);
  // A single cell (i.e. 30-minute interval) can have multiple external events
  // inside it. We want to show them side-by-side.
  const colsUsedPerCell: {
    [dateTime: string]: {eventIdx: number, colStart: number}[];
  } = {};
  // Two events are in the same group if one can be reached from the other using
  // overlapping events
  // Map event index to array of other event indices
  const colGroups = Array<number[]>(externalEvents.length);
  // Map event index to rows (datetimes) used by event box
  const eventsToRows = Array<string[]>(externalEvents.length);
  // Map event index to object which contains the number of columns for
  // that event's group (object should be the same for all events in the group)
  const numColsPerGroup = Array<{val: number}>(externalEvents.length);
  const rowsToEvents: {
    [dateTime: string]: number[];
  } = {};
  for (let eventIdx = 0; eventIdx < externalEvents.length; eventIdx++) {
    // Note that startDateTime might not be aligned on a multiple of 30 minutes
    const {startDateTime, endDateTime} = externalEvents[eventIdx];
    // All elements of `dateTimes` are aligned on a multiple of 30 minutes
    const dateTimes = startAndEndDateTimeToDateTimesFlat(startDateTime, endDateTime);
    eventsToRows[eventIdx] = dateTimes;
    for (const dateTime of dateTimes) {
      if (rowsToEvents[dateTime]) {
        // All of the events in rowsToEvents[dateTime] belong to the same group,
        // so just take the group of the first one
        const otherEventIdx = rowsToEvents[dateTime][0];
        colGroups[eventIdx] = colGroups[otherEventIdx];
        colGroups[eventIdx].push(eventIdx);
        numColsPerGroup[eventIdx] = numColsPerGroup[otherEventIdx];
        break;
      }
    }
    if (!colGroups[eventIdx]) {
      // create a new group
      colGroups[eventIdx] = [eventIdx];
      numColsPerGroup[eventIdx] = {val: 0};
    }
    for (const dateTime of dateTimes) {
      if (!rowsToEvents[dateTime]) rowsToEvents[dateTime] = [];
      rowsToEvents[dateTime].push(eventIdx);
    }
  }
  for (let eventIdx = 0; eventIdx < externalEvents.length; eventIdx++) {
    const dateTimes = eventsToRows[eventIdx];
    const numColsInGroup = numColsPerGroup[eventIdx].val;
    // Try to find an empty column
    let colNum = 1;
    for (; colNum <= numColsInGroup; colNum++) {
      let occupied = false;
      for (const dateTime of dateTimes) {
        if (!colsUsedPerCell[dateTime]) continue;
        for (const {colStart} of colsUsedPerCell[dateTime]) {
          if (colStart === colNum) {
            occupied = true;
            break;
          }
        }
        if (occupied) break;
      }
      if (!occupied) break;
    }
    if (colNum === numColsInGroup + 1) {
      // Need to add a new column
      numColsPerGroup[eventIdx].val++;
    }
    for (const dateTime of dateTimes) {
      if (!colsUsedPerCell[dateTime]) colsUsedPerCell[dateTime] = [];
      colsUsedPerCell[dateTime].push({eventIdx, colStart: colNum});
    }
  }

  const result: ExternalEventInfosWithNumCols = {};
  for (let eventIdx = 0; eventIdx < externalEvents.length; eventIdx++) {
    const externalEvent = externalEvents[eventIdx];
    const dateTimes = eventsToRows[eventIdx];
    const numCols = numColsPerGroup[eventIdx].val;
    result[dateTimes[0]] ??= {events: [], numCols};
    const {colStart} = colsUsedPerCell[dateTimes[0]].filter(e => e.eventIdx === eventIdx)[0];
    result[dateTimes[0]].events.push({colStart, ...externalEvent});
  }
  return result;
}

// The number of seconds which a single cell represents
const SECONDS_IN_THIRTY_MINUTES = 30 * 60;
// Calculates the top offset and height of an external event box in a cell,
// in fractions of the height of a single cell
export function calculateTopOffsetAndHeightOfExternalEventBox(
  cellStartTime: string, eventStartTime: string, eventEndTime: string,
): {
  topOffset: number;
  height: number;
} {
  const cellStartTimeEpochSeconds = new Date(cellStartTime).getTime() / 1000;
  const eventStartTimeEpochSeconds = new Date(eventStartTime).getTime() / 1000;
  const eventEndTimeEpochSeconds = new Date(eventEndTime).getTime() / 1000;
  assert(Number.isInteger(cellStartTimeEpochSeconds));
  assert(Number.isInteger(eventStartTimeEpochSeconds));
  assert(Number.isInteger(eventEndTimeEpochSeconds));
  assert(eventStartTimeEpochSeconds >= cellStartTimeEpochSeconds);
  const topOffset = (eventStartTimeEpochSeconds - cellStartTimeEpochSeconds) / SECONDS_IN_THIRTY_MINUTES;
  const height = (eventEndTimeEpochSeconds - eventStartTimeEpochSeconds) / SECONDS_IN_THIRTY_MINUTES;
  return {topOffset, height};
}
