import React, { useContext, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { PeopleDateTimes, Style } from 'common/types';
import {
  selectSelModeAndDateTimes,
  addDateTime,
  removeDateTime,
} from 'slices/availabilitiesSelection';
import { range } from 'utils/arrays';
import { toastContext } from 'features/toast/Toast';
import { addDaysToDateString, customToISOString } from 'utils/dates';

const green = [0x22, 0x8B, 0x22];  // 'forestgreen'
// TODO: hide everyone else's dateTimes when editing a user
const blue = [0, 0xFF, 0xFF];  // 'aqua'

function rgbToStr(rgb: number[]) {
  return '#' + rgb.map(val => val.toString(16).padStart(2, '0')).join('');
}

type DateTimePeople = {
  [dateTime: string]: string[];
};

function MeetingGridBodyCells({
  numRows, numCols, startHour, dateStrings, availabilities, setHoverDateTime,
  hoverUser,
}: {
  numRows: number, numCols: number, startHour: number, dateStrings: string[],
  availabilities: PeopleDateTimes, setHoverDateTime: (dateTime: string | null) => void,
  hoverUser: string | null, 
}) {
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
  const { showToast } = useContext(toastContext);
  return (
    <React.Fragment>
      {
        range(numRows * numCols).map(i => {
          let hourStr = null;
          const colIdx = i % numCols,
                rowIdx = Math.floor(i / numCols);
          if (colIdx === 0 && rowIdx % 2 === 0) {
            const hour = (startHour + Math.floor(rowIdx / 2)) % 24;
            hourStr = (hour % 12 === 0 ? 12 : hour % 12) + ' ' + (hour < 12 ? 'AM' : 'PM');
          }
          const style: Style = {};
          let onMouseEnter: React.MouseEventHandler | undefined,
              onMouseLeave: React.MouseEventHandler | undefined,
              onClick: React.MouseEventHandler | undefined;
          if (rowIdx === 0 && colIdx > 0) style.borderTop = '1px solid lightgray';
          if (colIdx === 1) style.borderLeft = '1px solid lightgray';
          if (colIdx > 0) {
            const hour = (startHour + Math.floor(rowIdx / 2)) % 24;
            let date = dateStrings[colIdx - 1];
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
            let rgba = [255, 255, 255, 0];
            if (selMode.type === 'editingSelf' || selMode.type === 'submittingSelf') {
              if (selectedDateTimes[dateTime]) {
                rgba = [...blue, 255];
              }
            } else if (selMode.type === 'selectedOther') {
              if (availabilities[selMode.otherUser][dateTime]) {
                rgba = [...green, 255];
              }
            } else if (selMode.type === 'editingOther' || selMode.type === 'submittingOther') {
              if (selectedDateTimes[dateTime]) {
                rgba = [...green, 255];
              }
            } else if (hoverUser !== null) {
              if (availabilities[hoverUser][dateTime]) {
                rgba = [...green, 255];
              }
            } else if (dateTimePeople[dateTime]?.length > 0) {
              const peopleAvailable = dateTimePeople[dateTime].length;
              rgba = [
                ...green,
                Math.round(255 * (0.2 + 0.8 * (peopleAvailable / totalPeople))),
              ];
            }
            style.backgroundColor = rgbToStr(rgba);
            onMouseEnter = () => {
              setHoverDateTime(dateTime);
            };
            onMouseLeave = () => {
              setHoverDateTime(null);
            };
            
            onClick = () => {
              if (selMode.type === 'editingSelf' || selMode.type === 'editingOther') {
                if (selectedDateTimes[dateTime]) {
                  dispatch(removeDateTime(dateTime));
                } else {
                  dispatch(addDateTime(dateTime));
                }
              } else if (selMode.type === 'none') {
                showToast({
                  msg: "Click the 'Add availability' button",
                  msgType: 'success',
                });
              } else if (selMode.type === 'selectedOther') {
                showToast({
                  msg: `Click the 'Edit availability' button`,
                  msgType: 'success',
                });
              }
            };
          }
          return (
            <div
              key={i}
              className={'weeklyview__' + ((colIdx === 0) ? 'hourcell' : 'bodycell')}
              style={style}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onClick={onClick}
            >
              {hourStr}
            </div>
          );
        })
      }
    </React.Fragment>
  )
}
export default React.memo(MeetingGridBodyCells);
