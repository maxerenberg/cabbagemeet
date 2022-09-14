import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style } from 'common/types';
import {
  selectSelMode,
  selectSelectedTimes,
  selectHoverUser,
  setHoverDateTime,
  addDateTime,
  removeDateTime,
} from 'slices/availabilitiesSelection';
import { range } from 'utils/arrays';
import { useToast } from 'components/Toast';
import { addDaysToDateString, customToISOString } from 'utils/dates';
import { assertIsNever } from 'utils/misc';

type DateTimePeople = {
  [dateTime: string]: string[];
};

function MeetingGridBodyCells({
  numRows, numCols, startHour, dateStrings,
}: {
  numRows: number, numCols: number, startHour: number, dateStrings: string[],
}) {
  const availabilities = useAppSelector(state => state.meetingTimes.availabilities);
  const dateTimePeople = useMemo(() => {
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
  }, [availabilities]);
  const totalPeople = Object.keys(availabilities).length;
  const selMode = useAppSelector(selectSelMode);
  const hoverUser = useAppSelector(selectHoverUser);

  return (
    <>
      {
        range(numRows * numCols).map(i => {
          const colIdx = i % numCols;
          const rowIdx = Math.floor(i / numCols);
          const hour = (startHour + Math.floor(rowIdx / 2)) % 24;
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
          const hoverUserIsAvailableAtThisTime = hoverUser !== null && availabilities[hoverUser][dateTime];
          const selectedUserIsAvailableAtThisTime = selMode.type === 'selectedOther' && availabilities[selMode.otherUser][dateTime];
          const numPeopleAvailableAtThisTime = dateTimePeople[dateTime]?.length ?? 0;
          return (
            <Cell key={i} {...{
              cellIdx: i,
              rowIdx,
              colIdx,
              dateTime,
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

const Cell = React.memo(function Cell({
  rowIdx,
  colIdx,
  cellIdx,
  dateTime,
  hoverUserIsAvailableAtThisTime,
  selectedUserIsAvailableAtThisTime,
  numPeopleAvailableAtThisTime,
  totalPeople,
}: {
  rowIdx: number,
  colIdx: number,
  cellIdx: number,
  dateTime: string,
  hoverUserIsAvailableAtThisTime: boolean,
  selectedUserIsAvailableAtThisTime: boolean,
  numPeopleAvailableAtThisTime: number,
  totalPeople: number,
}) {
  const selMode = useAppSelector(selectSelMode);
  const dateTimeIsSelected = useAppSelector(state => !!selectSelectedTimes(state)[dateTime]);
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
  if (selMode.type === 'editingSelf' || selMode.type === 'submittingSelf') {
    if (dateTimeIsSelected) {
      rgb = '0, 255, 255';  // aqua (TODO: define in custom.scss)
    }
  } else if (selMode.type === 'selectedOther') {
    if (selectedUserIsAvailableAtThisTime) {
      rgb = 'var(--custom-primary-rgb)';
    }
  } else if (selMode.type === 'editingOther' || selMode.type === 'submittingOther') {
    if (dateTimeIsSelected) {
      rgb = 'var(--custom-primary-rgb)';
    }
  } else if (selMode.type === 'none') {
    if (hoverUserIsAvailableAtThisTime) {
      rgb = 'var(--custom-primary-rgb)';
    } else if (numPeopleAvailableAtThisTime > 0) {
      rgb = 'var(--custom-primary-rgb)';
      const peopleAvailable = numPeopleAvailableAtThisTime;
      alpha = Math.round(100 * (0.2 + 0.8 * (peopleAvailable / totalPeople))) + '%';
    }
  } else {
    assertIsNever(selMode.type);
  }

  if (rgb !== undefined) {
    style.backgroundColor = `rgba(${rgb}, ${alpha})`;
  }
  let onMouseEnter: React.MouseEventHandler | undefined;
  let onMouseLeave: React.MouseEventHandler | undefined;
  let onClick: React.MouseEventHandler | undefined;
  if (selMode.type === 'editingSelf' || selMode.type === 'editingOther') {
    if (dateTimeIsSelected) {
      onClick = () => dispatch(removeDateTime(dateTime));
    } else {
      onClick = () => dispatch(addDateTime(dateTime));
    }
  } else if (selMode.type === 'selectedOther') {
    onClick = () => showToast({
      msg: `Click the 'Edit availability' button`,
      msgType: 'success',
      autoClose: true,
    });
  } else if (selMode.type === 'none') {
    onClick = () => showToast({
      msg: "Click the 'Add availability' button",
      msgType: 'success',
      autoClose: true,
    });
    onMouseEnter = () => dispatch(setHoverDateTime(dateTime));
    onMouseLeave = () => dispatch(setHoverDateTime(null));
  }
  return (
    <div
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
    </div>
  );
});
