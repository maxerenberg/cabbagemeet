import React from 'react';
import {
  addDaysToDateString,
  getDateString,
  getMonthAbbr,
  getYearMonthDayFromDateString,
  today,
  todayString,
} from 'utils/dates';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { addDate, removeDate, selectSelectedDates } from 'slices/selectedDates';

type CalendarCellProps = {
  firstDateInGrid: string;  // YYYY-MM-DD
  cellIdx: number;
};

function CalendarCell({firstDateInGrid, cellIdx}: CalendarCellProps) {
  const dateString = addDaysToDateString(firstDateInGrid, cellIdx);
  const [, month, day] = getYearMonthDayFromDateString(dateString);
  const isEmpty = dateString < getDateString(today);
  const isSelected = useAppSelector(state => !!selectSelectedDates(state)[dateString]);
  const dispatch = useAppDispatch();
  const onClick = () => {
    if (isEmpty) {
      return;
    }
    if (isSelected) {
      dispatch(removeDate(dateString));
    } else {
      dispatch(addDate(dateString));
    }
  };
  return (
    <div className="daypicker-calendar__cell">
      {!isEmpty && (
        <>
          {
            (dateString === todayString || dateString === firstDateInGrid || day === 1) ? (
              <div className="daypicker-calendar-cell-month-indicator">
                {getMonthAbbr(month-1)}
              </div>
            ) : (
              <div style={{height: '1em'}}></div>
            )
          }
          <div
            className={"daypicker-calendar__cell__button " + (
              isSelected ? "selected" : " unselected"
            )}
            onClick={onClick}
          >
            {day}
          </div>
        </>
      )}
    </div>
  );
};
export default React.memo(CalendarCell);
