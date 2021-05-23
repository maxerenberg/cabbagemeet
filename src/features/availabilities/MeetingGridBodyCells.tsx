import React, { useMemo } from 'react';
import { PeopleDateTimes, DateTimes, Style } from '../../common/types';
import type { SelModeType, DateTime } from './types';
import { getUserFromSelMode } from './types';
import { range } from '../daypicker/dateUtils';
import { ToastMessageProps } from '../toast/Toast';

const green = [0x22, 0x8B, 0x22];  // 'forestgreen'
const blue = [0, 0xFF, 0xFF];  // 'aqua'

function rgbToStr(rgb: number[]) {
  return '#' + rgb.map(val => val.toString(16).padStart(2, '0')).join('');
}

const MeetingGridBodyCells = React.memo(function MeetingGridBodyCells({
  numRows, numCols, startHour, dateStrings, availabilities, setHoverDateTime,
  hoverUser, selMode, selectedDateTimes, setSelectedDateTimes, showToast,
}: {
  numRows: number, numCols: number, startHour: number, dateStrings: string[],
  availabilities: PeopleDateTimes, setHoverDateTime: (dateTime: DateTime | null) => void,
  hoverUser: string | null, selMode: SelModeType, selectedDateTimes: DateTimes,
  setSelectedDateTimes: (dateTimes: DateTimes) => void,
  showToast: (props: ToastMessageProps) => void,
}) {
  type DayTimePeople = {
    [day: string]: {
      [time: number]: string[]
    }
  };
  const dateStringsSet = useMemo(() => new Set(dateStrings), [dateStrings]);
  const dayTimePeople = useMemo(() => {
    const days: DayTimePeople = {};
    for (const [person, dateTimes] of Object.entries(availabilities)) {
      for (const [dateString, times] of Object.entries(dateTimes)) {
        if (!dateStringsSet.has(dateString)) continue;
        if (!days[dateString]) days[dateString] = {};
        for (const time of times) {
          if (!days[dateString][time]) days[dateString][time] = [];
          days[dateString][time].push(person);
        }
      }
    }
    return days;
  }, [dateStringsSet, availabilities]);
  const totalPeople = Object.keys(availabilities).length;
  const selectedUser = getUserFromSelMode(selMode);
  return (
    <React.Fragment>
      {
        range(numRows * numCols).map(i => {
          let hourStr = null;
          const colIdx = i % numCols,
                rowIdx = Math.floor(i / numCols);
          if (colIdx === 0 && rowIdx % 2 === 0) {
            const hour = startHour + (rowIdx / 2);
            hourStr = (hour % 12 === 0 ? 12 : hour % 12) + ' ' + (hour < 12 ? 'AM' : 'PM');
          }
          const style: Style = {};
          let onMouseEnter: React.MouseEventHandler | undefined,
              onMouseLeave: React.MouseEventHandler | undefined,
              onClick: React.MouseEventHandler | undefined;
          if (rowIdx === 0 && colIdx > 0) style.borderTop = '1px solid lightgray';
          if (colIdx === 1) style.borderLeft = '1px solid lightgray';
          if (colIdx > 0) {
            const dateString = dateStrings[colIdx - 1];
            const time = startHour + (rowIdx / 2);
            let rgba = [255, 255, 255, 0];
            if (selMode === 'editingSelf'
                && selectedDateTimes[dateString]?.includes(time)) {
              rgba = [...blue, 255];
            } else if (selectedUser) {
              if (
                (
                  availabilities[selectedUser][dateString]?.includes(time)
                  && !selectedDateTimes[dateString]?.includes(time)
                ) || (
                  !availabilities[selectedUser][dateString]?.includes(time)
                  && selectedDateTimes[dateString]?.includes(time)
                )
              ) {
                rgba = [...green, 255];
              }
            } else if (hoverUser) {
              if (availabilities[hoverUser][dateString]?.includes(time)) {
                rgba = [...green, 255];
              }
            } else if (dayTimePeople[dateString]
                && dayTimePeople[dateString][time]?.length > 0) {
              const peopleAvailable = dayTimePeople[dateString][time].length;
              rgba = [
                ...green,
                Math.round(255 * (0.2 + 0.8 * (peopleAvailable / totalPeople))),
              ];
            }
            style.backgroundColor = rgbToStr(rgba);
            onMouseEnter = () => {
              setHoverDateTime([dateString, time]);
            };
            onMouseLeave = () => {
              setHoverDateTime(null);
            };
            
            onClick = () => {
              if (selMode === 'editingSelf' || selMode.startsWith('editingOther')) {
                if (selectedDateTimes[dateString]?.includes(time)) {
                  setSelectedDateTimes({
                    ...selectedDateTimes,
                    [dateString]: selectedDateTimes[dateString].filter(t => t !== time),
                  });
                } else {
                  setSelectedDateTimes({
                    ...selectedDateTimes,
                    [dateString]: [
                      ...(selectedDateTimes[dateString] || []),
                      time,
                    ],
                  });
                }
              } else if (selMode === 'none') {
                showToast({
                  msg: "Click the 'Add availability' button",
                  msgType: 'success',
                });
              } else if (selMode.startsWith('selectedOther')) {
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
});
export default MeetingGridBodyCells;
