import React, { useState } from 'react';
import { range } from 'utils/arrays'
import { daysOfWeek, getDateString, today } from 'utils/dates';
import MonthTitle from './MonthTitle';
import CalendarCell from './CalendarCell';
import { selectSelectedDates } from 'slices/selectedDates';
import { useAppSelector } from 'app/hooks';

function Calendar() {
  const selectedDates = useAppSelector(selectSelectedDates);
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const month = monthIdx + 1;
  const [year, setYear] = useState(today.getFullYear());
  const firstDayOfMonth = new Date(year, monthIdx, 1);
  // Go to the 0th day of the next month, which is actually
  // the last day of this month
  const lastDayOfMonth = new Date(year, monthIdx + 1, 0);
  const numDaysInMonth = lastDayOfMonth.getDate();
  
  const lessThanTodayInCurrentMonth = (day: number) => (
    monthIdx === today.getMonth()
    && year === today.getFullYear()
    && day < today.getDate()
  );
  const monthCells = range(1, numDaysInMonth + 1).map((day) => (
    <CalendarCell
      year={year}
      month={month}
      day={day}
      isDisabled={lessThanTodayInCurrentMonth(day)}
      isSelected={!!selectedDates[getDateString(year, month, day)]}
      key={day}
    />
  ));
  
  const numEmptyCellsBeforeFirstDay = firstDayOfMonth.getDay();
  const numEmptyCellsAfterLastDay = 6 - lastDayOfMonth.getDay();
  const emptyCellsBeforeFirstDay = range(numEmptyCellsBeforeFirstDay).map((i) => (
    <CalendarCell key={1 - numEmptyCellsBeforeFirstDay + i} isEmpty />
  ));
  const emptyCellsAfterLastDay = range(numEmptyCellsAfterLastDay).map((i) => (
    <CalendarCell key={numDaysInMonth + 1 + i} isEmpty />
  ));
  return (
    <div>
      <MonthTitle
        year={year}
        monthIdx={monthIdx}
        today={today}
        setYear={setYear}
        setMonthIdx={setMonthIdx}
      />
      <div className="daypicker-calendar">
        <DayOfWeekRow />
        {emptyCellsBeforeFirstDay}
        {monthCells}
        {emptyCellsAfterLastDay}
      </div>
    </div>
  );
};
export default React.memo(Calendar);

const DayOfWeekRow = React.memo(function DayOfWeekRow() {
  return (
    <>
      {daysOfWeek.map(day => (
        <div key={day} style={{textAlign: 'center'}}>{day}</div>
      ))}
    </>
  );
});
