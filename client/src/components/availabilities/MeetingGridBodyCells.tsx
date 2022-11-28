import React, { ReactElement, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { PeopleDateTimes, Style } from 'common/types';
import {
  useGetCurrentMeetingWithSelector,
  useGetGoogleCalendarEventsIfTokenIsPresent,
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

function MouseupProvider({
  children,
  dateTimes,
}: React.PropsWithChildren<{
  dateTimes: string[][],
}>) {
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

  return <>{children}</>;
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
  const dateTimes = useMemo((): string[][] => {
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
  }, [numRows, numCols, dateStrings, startHour]);
  const scheduleSet = useMemo(() => scheduledDateTimes || {}, [scheduledDateTimes]);
  const meetingID = useAppSelector(selectCurrentMeetingID);
  assert(meetingID !== undefined);
  const {data: externalEvents} = useGetGoogleCalendarEventsIfTokenIsPresent(meetingID);
  // Take the first event of each dateTime, and take the first dateTime of each event
  const dateTimesToExternalEventInfo = useMemo(() => {
    const result: {
      [dateTime: string]: {
        eventName: string;
        isStartOfEvent: boolean;
      }
    } = {};
    if (externalEvents === undefined) {
      return result;
    }
    for (const {summary, startDateTime, endDateTime} of externalEvents.events) {
      const dateTimes = startAndEndDateTimeToDateTimesFlat(startDateTime, endDateTime);
      for (const dateTime of dateTimes) {
        result[dateTime] = {
          eventName: summary,
          isStartOfEvent: dateTime === startDateTime
        };
      }
    }
    return result;
  }, [externalEvents]);
  const earliestScheduledDateTime = useMemo(() => {
    const dateTimes = Object.keys(scheduleSet);
    return dateTimes.length > 0 ? dateTimes.sort()[0] : null;
  }, [scheduleSet]);
  const selMode = useAppSelector(selectSelMode);
  const hoverUser = useAppSelector(selectHoverUser);
  const somebodyIsHovered = hoverUser !== null;

  return (
    <MouseupProvider dateTimes={dateTimes}>
      {
        gridCoords.map(([colIdx, rowIdx], i) => {
          const dateTime = dateTimes[rowIdx][colIdx];
          const isScheduled = scheduleSet[dateTime];
          const isEarliestScheduled = dateTime === earliestScheduledDateTime;
          const externalEventName = dateTimesToExternalEventInfo[dateTime]?.eventName;
          const isFirstDateTimeOfExternalEvent = dateTimesToExternalEventInfo[dateTime]?.isStartOfEvent ?? false;
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
              externalEventName,
              isFirstDateTimeOfExternalEvent,
              somebodyIsHovered,
              hoverUserIsAvailableAtThisTime,
              selectedUserIsAvailableAtThisTime,
              totalPeople,
              numPeopleAvailableAtThisTime,
            }} />
          );
        })
      }
    </MouseupProvider>
  )
}
export default React.memo(MeetingGridBodyCells);

const Cell = React.memo(function Cell({
  rowIdx,
  colIdx,
  cellIdx,
  dateTime,
  isScheduled,
  isEarliestScheduled,
  externalEventName,
  isFirstDateTimeOfExternalEvent,
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
  externalEventName: string | undefined,
  isFirstDateTimeOfExternalEvent: boolean,
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
  const className = classNames.join(' ');

  const style: Style = {gridArea: `c${cellIdx}`};
  let rgb: string | undefined;
  let alpha = '100%';
  if (selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent') {
    if (
      (isInMouseSelectionArea && mouseSelectionAreaIsAddingDateTimes)
      || (!isInMouseSelectionArea && isSelected)
    ) {
      rgb = 'var(--custom-primary-rgb)';
    }
  } else if (selMode.type === 'editingSchedule') {
    if (isInMouseSelectionColumn || isSelected) {
      rgb = 'var(--custom-scheduled-cell-rgb)';
    } else if (numPeopleAvailableAtThisTime > 0) {
      rgb = 'var(--custom-primary-rgb)';
      alpha = Math.round(100 * (0.2 + 0.8 * (numPeopleAvailableAtThisTime / totalPeople))) + '%';
    }
  } else if (selMode.type === 'selectedUser') {
    if (selectedUserIsAvailableAtThisTime) {
      rgb = 'var(--custom-primary-rgb)';
    }
  } else if (selMode.type === 'none') {
    if (somebodyIsHovered) {
      if (hoverUserIsAvailableAtThisTime) {
        rgb = 'var(--custom-primary-rgb)';
      }
    } else if (numPeopleAvailableAtThisTime > 0) {
      rgb = 'var(--custom-primary-rgb)';
      alpha = Math.round(100 * (0.2 + 0.8 * (numPeopleAvailableAtThisTime / totalPeople))) + '%';
    }
  } else {
    assertIsNever(selMode);
  }

  let externalEventBox: ReactElement<HTMLDivElement> | undefined;
  if (
    (
      selMode.type === 'addingRespondent'
      || selMode.type === 'editingRespondent'
    )
    && externalEventName !== undefined
    //&& !meetingIsScheduled
  ) {
    externalEventBox = (
      <div className="weeklyview__bodycell_external_event">
        {isFirstDateTimeOfExternalEvent && externalEventName}
      </div>
    );
  }

  let scheduledTimeBox: ReactElement<HTMLDivElement> | undefined;
  if (
    selMode.type === 'none'
    && isScheduled
  ) {
    scheduledTimeBox = (
      <div className="weeklyview__bodycell_scheduled_inner">
        {isEarliestScheduled && 'SCHEDULED'}
      </div>
    );
  }

  if (rgb !== undefined) {
    style.backgroundColor = `rgba(${rgb}, ${alpha})`;
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
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
    >
      {/* at most of one of these will be shown */}
      {scheduledTimeBox}
      {externalEventBox}
    </div>
  );
});