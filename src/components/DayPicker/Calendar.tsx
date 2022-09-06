import React, { useState } from 'react';
import { range } from 'utils/arrays'
import {
  addDaysToDateString,
  daysOfWeek,
  today,
  todayString,
 } from 'utils/dates';
import CalendarCell from './CalendarCell';

export default function Calendar() {
  const [page, setPage] = useState(0);
  const firstDateInGridForPage0 = addDaysToDateString(todayString, -today.getDay());
  const firstDateInGrid = addDaysToDateString(firstDateInGridForPage0, 28 * page);
  
  const monthCells = range(28).map((cellIdx) => (
    <CalendarCell
      cellIdx={cellIdx}
      firstDateInGrid={firstDateInGrid}
      key={cellIdx}
    />
  ));

  const leftArrow = (
    <div className="daypicker-calendar-arrow">
      <span
        className="daypicker-calendar-arrow__inner"
        style={{visibility: page > 0 ? 'visible' : 'hidden'}}
        onClick={() => setPage(page - 1)}
      >
        &lt;
      </span>
    </div>
  );
  const rightArrow = (
    <div className="daypicker-calendar-arrow">
      <span
        className="daypicker-calendar-arrow__inner"
        onClick={() => setPage(page + 1)}
      >
        &gt;
      </span>
    </div>
  );

  return (
    <div style={{display: 'flex', flexFlow: 'row nowrap'}}>
      {leftArrow}
      <div className="daypicker-calendar">
        <DayOfWeekRow />
        {monthCells}
      </div>
      {rightArrow}
    </div>
  );
};

const DayOfWeekRow = React.memo(function DayOfWeekRow() {
  return (
    <>
      {daysOfWeek.map(day => (
        <div key={day} style={{
          textAlign: 'center',
          paddingBottom: '0.4rem',
          borderBottom: '1px solid lightgray',
        }}>
          {day}
        </div>
      ))}
    </>
  );
});
