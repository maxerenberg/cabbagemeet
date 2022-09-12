import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style } from 'common/types';
import {
  selectSelModeAndDateTimes,
  addDateTime,
  removeDateTime,
} from 'slices/availabilitiesSelection';
import { range } from 'utils/arrays';
import { useToast } from 'components/Toast';
import { addDaysToDateString, customToISOString } from 'utils/dates';

type DateTimePeople = {
  [dateTime: string]: string[];
};

function MeetingGridBodyCells({
  numRows, numCols, startHour, dateStrings, setHoverDateTime,
  hoverUser,
}: {
  numRows: number, numCols: number, startHour: number, dateStrings: string[],
  setHoverDateTime: (dateTime: string | null) => void,
  hoverUser: string | null, 
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
  const {selMode, dateTimes: selectedDateTimes} = useAppSelector(selectSelModeAndDateTimes);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  return (
    <>
      {
        range(numRows * numCols).map(i => {
          const colIdx = i % numCols;
          const rowIdx = Math.floor(i / numCols);
          const style: Style = {gridArea: `c${i}`};
          const classNames = ['weeklyview__bodycell'];
          if (rowIdx === 0) classNames.push('weeklyview__bodycell_firstrow');
          if (colIdx === 0) classNames.push('weeklyview__bodycell_firstcol');
          if (rowIdx % 2 === 1) classNames.push('weeklyview__bodycell_oddrow');
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
          let rgb: string | undefined;
          let alpha = '100%';
          if (selMode.type === 'editingSelf' || selMode.type === 'submittingSelf') {
            if (selectedDateTimes[dateTime]) {
              rgb = '0, 255, 255';  // aqua (TODO: define in custom.scss)
            }
          } else if (selMode.type === 'selectedOther') {
            if (availabilities[selMode.otherUser][dateTime]) {
              rgb = 'var(--custom-primary-rgb)';
            }
          } else if (selMode.type === 'editingOther' || selMode.type === 'submittingOther') {
            if (selectedDateTimes[dateTime]) {
              rgb = 'var(--custom-primary-rgb)';
            }
          } else if (hoverUser !== null) {
            if (availabilities[hoverUser][dateTime]) {
              rgb = 'var(--custom-primary-rgb)';
            }
          } else if (dateTimePeople[dateTime]?.length > 0) {
            rgb = 'var(--custom-primary-rgb)';
            const peopleAvailable = dateTimePeople[dateTime].length;
            alpha = Math.round(100 * (0.2 + 0.8 * (peopleAvailable / totalPeople))) + '%';
          }
          if (rgb !== undefined) {
            style.backgroundColor = `rgba(${rgb}, ${alpha})`;
          }
          const onMouseEnter = () => {
            setHoverDateTime(dateTime);
          };
          const onMouseLeave = () => {
            setHoverDateTime(null);
          };
          let onClick: React.MouseEventHandler | undefined;
          if (selMode.type === 'editingSelf' || selMode.type === 'editingOther') {
            if (selectedDateTimes[dateTime]) {
              onClick = () => dispatch(removeDateTime(dateTime));
            } else {
              onClick = () => dispatch(addDateTime(dateTime));
            }
          } else if (selMode.type === 'none') {
            onClick = () => showToast({
              msg: "Click the 'Add availability' button",
              msgType: 'success',
              autoClose: true,
            });
          } else if (selMode.type === 'selectedOther') {
            onClick = () => showToast({
              msg: `Click the 'Edit availability' button`,
              msgType: 'success',
              autoClose: true,
            });
          }
          return (
            <div
              key={i}
              className={classNames.join(' ')}
              style={style}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onClick={onClick}
            >
            </div>
          );
        })
      }
    </>
  )
}
export default React.memo(MeetingGridBodyCells);
