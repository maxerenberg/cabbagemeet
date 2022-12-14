import React, { ReactElement, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { PeopleDateTimes, Style } from 'common/types';
import {
  useGetCurrentMeetingWithSelector,
  useGetExternalCalendarEventsIfTokenIsPresent,
} from 'utils/meetings.hooks';
import {
  selectSelMode,
  selectSelectedTimes,
  selectHoverUser,
  setHoverDateTime,
  addDateTimesAndResetMouse,
  removeDateTimesAndResetMouse,
  selectMouseState,
  notifyMouseUp,
  notifyMouseDown,
  notifyMouseEnter,
} from 'slices/availabilitiesSelection';
import type { MouseState } from 'slices/availabilitiesSelection';
import { useToast } from 'components/Toast';
import { flatGridCoords } from 'utils/arrays.utils';
import { addDaysToDateString, customToISOString, startAndEndDateTimeToDateTimesFlat } from 'utils/dates.utils';
import { assert, assertIsNever } from 'utils/misc.utils';
import { selectCurrentMeetingID } from 'slices/currentMeeting';
import type { OAuth2CalendarEventsResponseItem } from 'slices/api';

// TODO: deal with decimal start/end times

type DateTimePeople = {
  [dateTime: string]: string[];
};

function createDateTimePeople(availabilities: PeopleDateTimes): DateTimePeople {
  const result: DateTimePeople = {};
    for (const [person, dateTimes] of Object.entries(availabilities)) {
      for (const dateTime of Object.keys(dateTimes)) {
        if (!result.hasOwnProperty(dateTime)) {
          result[dateTime] = [];
        }
        result[dateTime].push(person);
      }
    }
    return result;
}

function cellIsInSelectionArea(
  rowIdx: number,
  colIdx: number,
  state: MouseState,
): boolean {
  return (state.type === 'down' || state.type === 'upCellsSelected') && (
    (
      (state.downCell.rowIdx <= rowIdx && rowIdx <= state.curCell.rowIdx)
      || (state.curCell.rowIdx <= rowIdx && rowIdx <= state.downCell.rowIdx)
    ) && (
      (state.downCell.colIdx <= colIdx && colIdx <= state.curCell.colIdx)
      || (state.curCell.colIdx <= colIdx && colIdx <= state.downCell.colIdx)
    )
  );
}

function cellIsInSelectionColumn(
  rowIdx: number,
  colIdx: number,
  state: MouseState,
): boolean {
  return (state.type === 'down' || state.type === 'upCellsSelected') && (
    (
      (state.downCell.rowIdx <= rowIdx && rowIdx <= state.curCell.rowIdx)
      || (state.curCell.rowIdx <= rowIdx && rowIdx <= state.downCell.rowIdx)
    ) && (
      state.downCell.colIdx === colIdx
    )
  );
}

function useMouseupListener(dateTimes: string[][]) {
  const dispatch = useAppDispatch();
  const selMode = useAppSelector(selectSelMode);
  const mouseState = useAppSelector(selectMouseState);

  // The mouseup listener needs to be attached to the whole document
  // because we need to dispatch the 'up' action no matter where the
  // event occurs
  useEffect(() => {
    const listener = () => dispatch(notifyMouseUp());
    document.addEventListener('mouseup', listener);
    return () => document.removeEventListener('mouseup', listener);
  }, [dispatch]);

  useEffect(() => {
    if (mouseState?.type !== 'upCellsSelected') {
      return;
    }
    const dateTimesInSelectionArea: string[] = [];
    let rowStart = mouseState.downCell.rowIdx;
    let rowEnd = mouseState.curCell.rowIdx;
    if (rowStart > rowEnd) {
      [rowStart, rowEnd] = [rowEnd, rowStart];
    }
    let colStart = mouseState.downCell.colIdx;
    let colEnd = mouseState.curCell.colIdx;
    if (selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent') {
      if (colStart > colEnd) {
        [colStart, colEnd] = [colEnd, colStart];
      }
    } else if (selMode.type === 'editingSchedule') {
      // Scheduled cells must be in the same column because they must be
      // chronologically contiguous
      colEnd = colStart;
    }
    for (let rowIdx = rowStart; rowIdx <= rowEnd; rowIdx++) {
      for (let colIdx = colStart; colIdx <= colEnd; colIdx++) {
        dateTimesInSelectionArea.push(dateTimes[rowIdx][colIdx]);
      }
    }
    if (selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent') {
      if (mouseState.downCellWasOriginallySelected) {
        dispatch(removeDateTimesAndResetMouse(dateTimesInSelectionArea));
      } else {
        dispatch(addDateTimesAndResetMouse(dateTimesInSelectionArea));
      }
    } else if (selMode.type === 'editingSchedule') {
      // When scheduling, each new selection erases the old one because
      // scheduled cells cannot be disjoint
      dispatch(addDateTimesAndResetMouse(dateTimesInSelectionArea));
    }
  }, [mouseState, selMode.type, dispatch, dateTimes]);
}

type ExternalEventInfoWithColStart = OAuth2CalendarEventsResponseItem & {
  colStart: number;  // starts from 1 (like grid-column-start)
};
function calculateExternalEventInfoColumns(externalEvents: OAuth2CalendarEventsResponseItem[]): {
  [dateTime: string]: ExternalEventInfoWithColStart[]
} {
// A single cell (i.e. 30-minute interval) can have multiple external events
    // inside it. We want to show them side-by-side.
    const result: {
      [dateTime: string]: ExternalEventInfoWithColStart[]
    } = {};
    if (externalEvents === undefined) {
      return result;
    }
    // Since we want overlapping events to be shown side-by-side, each cell must
    // be subdivided into columns. Note that a cell might have e.g. the first column
    // empty but the second column full, if we have two events like this:
    // +--+
    // |  | +--+
    // |  | |  |
    // +--+ |  |
    //      +--+
    // Note that the row at the bottom needs to have the second event in the second
    // column, even though it doesn't overlap with the first event.
    const maxColStartPerCell: {
      [dateTime: string]: number;
    } =  {};
    for (const externalEvent of externalEvents) {
      // Note that startDateTime might not be aligned on a multiple of 30 minutes
      const {startDateTime, endDateTime} = externalEvent;
      const dateTimes = startAndEndDateTimeToDateTimesFlat(startDateTime, endDateTime);
      // dateTimes[0] is aligned on a multiple of 30 minutes
      let maxColStart = 0;
      for (const dateTime of dateTimes) {
        if (maxColStartPerCell[dateTime] !== undefined) {
          maxColStart = Math.max(maxColStart, maxColStartPerCell[dateTime]);
        }
      }
      if (result[dateTimes[0]] === undefined) {
        result[dateTimes[0]] = [];
      }
      const colStart = maxColStart + 1;
      result[dateTimes[0]].push({...externalEvent, colStart});
      for (const dateTime of dateTimes) {
        maxColStartPerCell[dateTime] = colStart;
      }
    }
    return result;
}

function calculateDateTimeGrid(numRows: number, numCols: number, dateStrings: string[], startHour: number): string[][] {
  const rows: string[][] = [];
  for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
    const row: string[] = [];
    const hour = (startHour + Math.floor(rowIdx / 2)) % 24;
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      let date = dateStrings[colIdx];
      if (hour < startHour) {
        // This can happen if [startTime, endTime) spans midnight, e.g.
        // 10 P.M. to 2 A.M.
        date = addDaysToDateString(date, 1);
      }
      const dateTime = customToISOString(
        date,
        hour,
        rowIdx % 2 === 0 ? 0 : 30
      );
      row.push(dateTime);
    }
    rows.push(row);
  }
  return rows;
}

function MeetingGridBodyCells({
  numRows, numCols, startHour, dateStrings,
}: {
  numRows: number, numCols: number, startHour: number, dateStrings: string[],
}) {
  const {respondents, scheduledDateTimes} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({
      respondents: meeting?.respondents,
      scheduledDateTimes: meeting?.scheduledDateTimes,
    })
  );
  assert(respondents !== undefined);
  const totalPeople = Object.keys(respondents).length;
  const dateTimePeople = useMemo(() => {
    const availabilities: PeopleDateTimes = {};
    for (const [respondentID, respondent] of Object.entries(respondents)) {
      availabilities[respondentID] = respondent.availabilities;
    }
    return createDateTimePeople(availabilities);
  }, [respondents]);
  const gridCoords = useMemo(() => flatGridCoords(numRows, numCols), [numRows, numCols]);
  const dateTimes = useMemo(
    () => calculateDateTimeGrid(numRows, numCols, dateStrings, startHour),
    [numRows, numCols, dateStrings, startHour]
  );
  const scheduleSet = useMemo(() => scheduledDateTimes || {}, [scheduledDateTimes]);
  const meetingID = useAppSelector(selectCurrentMeetingID);
  assert(meetingID !== undefined);
  const externalEvents = useGetExternalCalendarEventsIfTokenIsPresent(meetingID);
  // FIXME: show overlapping events side-by-side
  const dateTimesToExternalEventInfo = useMemo(
    () => calculateExternalEventInfoColumns(externalEvents),
    [externalEvents]
  );
  // Use singleton to avoid re-renders
  const emptyArrayOfExternalEventInfo: ExternalEventInfoWithColStart[] = useMemo(() => [], []);
  const earliestScheduledDateTime = useMemo(() => {
    const dateTimes = Object.keys(scheduleSet);
    return dateTimes.length > 0 ? dateTimes.sort()[0] : null;
  }, [scheduleSet]);
  const selMode = useAppSelector(selectSelMode);
  const hoverUser = useAppSelector(selectHoverUser);
  const somebodyIsHovered = hoverUser !== null;
  useMouseupListener(dateTimes);
  return (
    <>
      {
        gridCoords.map(([colIdx, rowIdx], i) => {
          const dateTime = dateTimes[rowIdx][colIdx];
          const isScheduled = scheduleSet[dateTime];
          const isEarliestScheduled = dateTime === earliestScheduledDateTime;
          const externalEvents = dateTimesToExternalEventInfo[dateTime] || emptyArrayOfExternalEventInfo;
          const hoverUserIsAvailableAtThisTime = somebodyIsHovered && respondents[hoverUser].availabilities[dateTime];
          const selectedUserIsAvailableAtThisTime =
            selMode.type === 'selectedUser'
            && respondents[selMode.selectedRespondentID].availabilities[dateTime];
          const numPeopleAvailableAtThisTime = dateTimePeople[dateTime]?.length ?? 0;
          return (
            <Cell key={i} {...{
              cellIdx: i,
              rowIdx,
              colIdx,
              dateTime,
              isScheduled,
              isEarliestScheduled,
              externalEvents,
              somebodyIsHovered,
              hoverUserIsAvailableAtThisTime,
              selectedUserIsAvailableAtThisTime,
              totalPeople,
              numPeopleAvailableAtThisTime,
            }} />
          );
        })
      }
    </>
  )
}
export default React.memo(MeetingGridBodyCells);

// The number of seconds which a single cell represents
const SECONDS_IN_THIRTY_MINUTES = 30 * 60;
// Calculates the top offset and height of an external event box in a cell,
// in fractions of the height of a single cell
function calculateTopOffsetAndHeightOfExternalEventBox(
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

const Cell = React.memo(function Cell({
  rowIdx,
  colIdx,
  cellIdx,
  dateTime,
  isScheduled,
  isEarliestScheduled,
  externalEvents,
  somebodyIsHovered,
  hoverUserIsAvailableAtThisTime,
  selectedUserIsAvailableAtThisTime,
  numPeopleAvailableAtThisTime,
  totalPeople,
}: {
  rowIdx: number,
  colIdx: number,
  cellIdx: number,
  dateTime: string,
  isScheduled: boolean,
  isEarliestScheduled: boolean,
  externalEvents: ExternalEventInfoWithColStart[],
  somebodyIsHovered: boolean,
  hoverUserIsAvailableAtThisTime: boolean,
  selectedUserIsAvailableAtThisTime: boolean,
  numPeopleAvailableAtThisTime: number,
  totalPeople: number,
}) {
  const selMode = useAppSelector(selectSelMode);
  const isSelected = useAppSelector(state => !!selectSelectedTimes(state)[dateTime]);
  // const {meetingIsScheduled} = useGetCurrentMeetingWithSelector(
  //   ({data: meeting}) => ({meetingIsScheduled: meeting?.scheduledDateTimes !== undefined})
  // );
  const mouseStateType = useAppSelector((state) => selectMouseState(state)?.type);
  const isInMouseSelectionArea = useAppSelector((state) => {
    const mouseState = selectMouseState(state);
    return mouseState !== null && cellIsInSelectionArea(rowIdx, colIdx, mouseState);
  });
  const isInMouseSelectionColumn = useAppSelector((state) => {
    const mouseState = selectMouseState(state);
    return mouseState !== null && cellIsInSelectionColumn(rowIdx, colIdx, mouseState);
  });
  const mouseSelectionAreaIsAddingDateTimes = useAppSelector((state) => {
    const mouseState = selectMouseState(state);
    return (
      mouseState !== null
      && (mouseState.type === 'down' || mouseState.type === 'upCellsSelected')
      && !mouseState.downCellWasOriginallySelected
    );
  });
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const classNames = ['weeklyview__bodycell'];
  if (rowIdx === 0) classNames.push('weeklyview__bodycell_firstrow');
  if (colIdx === 0) classNames.push('weeklyview__bodycell_firstcol');
  if (rowIdx % 2 === 1) classNames.push('weeklyview__bodycell_oddrow');

  const style: Style = {gridArea: `c${cellIdx}`};
  let showRespondentsProportion = false;
  if (selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent') {
    if (
      (isInMouseSelectionArea && mouseSelectionAreaIsAddingDateTimes)
      || (!isInMouseSelectionArea && isSelected)
    ) {
      classNames.push('selected');
    }
  } else if (selMode.type === 'editingSchedule') {
    if (isInMouseSelectionColumn || isSelected) {
      classNames.push('selected');
    } else if (numPeopleAvailableAtThisTime > 0) {
      showRespondentsProportion = true;
    }
  } else if (selMode.type === 'selectedUser') {
    if (selectedUserIsAvailableAtThisTime) {
      classNames.push('selected');
    }
  } else if (selMode.type === 'none') {
    if (somebodyIsHovered) {
      if (hoverUserIsAvailableAtThisTime) {
        classNames.push('selected');
      }
    } else if (numPeopleAvailableAtThisTime > 0) {
      showRespondentsProportion = true;
    }
  } else {
    assertIsNever(selMode);
  }
  if (showRespondentsProportion) {
    const rgb = 'var(--custom-primary-rgb)';
    const alpha = Math.round(100 * (0.2 + 0.8 * (numPeopleAvailableAtThisTime / totalPeople))) + '%';
    style.backgroundColor = `rgba(${rgb}, ${alpha})`;
  }

  let externalEventBoxes: ReactElement<HTMLDivElement>[] | undefined;
  if (
    // FIXME: don't show external events if editing someone else
    (selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent')
    && externalEvents.length > 0
    //&& !meetingIsScheduled
  ) {
    classNames.push('position-relative', 'd-grid');
    const numExternalEventCols = Math.max(...externalEvents.map(e => e.colStart));
    style.gridTemplateColumns = `repeat(${numExternalEventCols}, 1fr)`;
    externalEventBoxes = externalEvents.map((externalEvent, i) => {
      const {topOffset, height} = calculateTopOffsetAndHeightOfExternalEventBox(dateTime, externalEvent.startDateTime, externalEvent.endDateTime);
      const topPercent = Math.floor(topOffset * 100) + '%';
      const heightPercent = Math.floor(height * 100) + '%';
      return (
        <div
          key={i}
          className="position-absolute weeklyview__bodycell_external_event"
          style={{
            top: topPercent,
            height: heightPercent,
            gridColumnStart: externalEvent.colStart,
            gridColumnEnd: externalEvent.colStart + 1,
          }}
        >
          <span className="weeklyview__bodycell_external_event_text">{externalEvent.summary}</span>
        </div>
      );
    });
  }

  let scheduledTimeBox: ReactElement<HTMLDivElement> | undefined;
  if (
    selMode.type === 'none'
    && isScheduled
  ) {
    scheduledTimeBox = (
      <div className="weeklyview__bodycell_scheduled_inner">
        {isEarliestScheduled && (
          <span className="weeklyview__bodycell_scheduled_inner_text">SCHEDULED</span>
        )}
      </div>
    );
  }

  let onMouseEnter: React.MouseEventHandler | undefined;
  let onMouseLeave: React.MouseEventHandler | undefined;
  let onMouseDown: React.MouseEventHandler | undefined;
  if (
    selMode.type === 'addingRespondent'
    || selMode.type === 'editingRespondent'
    || selMode.type === 'editingSchedule'
  ) {
    if (mouseStateType === 'upNoCellsSelected') {
      onMouseDown = () => dispatch(notifyMouseDown({cell: {rowIdx, colIdx}, wasOriginallySelected: isSelected}));
    } else if (mouseStateType === 'down') {
      onMouseEnter = () => dispatch(notifyMouseEnter({cell: {rowIdx, colIdx}}));
    }
  } else if (selMode.type === 'selectedUser') {
    onMouseDown = () => showToast({
      msg: `Click the 'Edit availability' button`,
      msgType: 'success',
      autoClose: true,
    });
  } else if (selMode.type === 'none') {
    onMouseDown = () => showToast({
      msg: "Click the 'Add availability' button",
      msgType: 'success',
      autoClose: true,
    });
    onMouseEnter = () => dispatch(setHoverDateTime(dateTime));
    // TODO: it's inefficient to have onMouseLeave on each cell - maybe we can
    // create a parent component around the Cell components and place it there?
    onMouseLeave = () => dispatch(setHoverDateTime(null));
  }
  return (
    <div
      className={classNames.join(' ')}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
    >
      {/* at most one of these will be shown */}
      {scheduledTimeBox}
      {externalEventBoxes}
    </div>
  );
});
