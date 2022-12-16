import type { OAuth2CalendarEventsResponseItem } from "slices/api";
import { startAndEndDateTimeToDateTimesFlat } from "utils/dates.utils";
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
// This isn't a very efficient layout algorithm, but at least it won't cause
// the external event boxes to overlap with each other.
export function calculateExternalEventInfoColumns(externalEvents: OAuth2CalendarEventsResponseItem[]): ExternalEventInfosWithNumCols {
  if (externalEvents === undefined) {
    return {};
  }
  // sanity check - make sure events are sorted by start date
  assert(externalEvents.every(
    (_, i) => i === externalEvents.length - 1
              || externalEvents[i].startDateTime <= externalEvents[i+1].startDateTime
  ));
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
        occupied = colsUsedPerCell[dateTime].some(({colStart}) => colNum === colStart);
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
