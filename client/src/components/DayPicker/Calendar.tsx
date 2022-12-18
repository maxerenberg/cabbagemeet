import React, { useState } from 'react';
import { LeftArrow as SVGLeftArrow, RightArrow as SVGRightArrow } from 'components/Arrows';
import { range } from 'utils/arrays.utils'
import {
  addDaysToDateString,
  daysOfWeekAbbr,
 } from 'utils/dates.utils';
import CalendarCell from './CalendarCell';

export default function Calendar({firstVisibleDate}: {firstVisibleDate: string}) {
  const [page, setPage] = useState(0);
  const firstSelectedDate_dayOfWeek = new Date(firstVisibleDate).getDay();
  const firstDateInGridForPage0 = addDaysToDateString(firstVisibleDate, -firstSelectedDate_dayOfWeek);
  const firstDateInGrid = addDaysToDateString(firstDateInGridForPage0, 28 * page);

  const monthCells = range(28).map((cellIdx) => (
    <CalendarCell
      key={cellIdx}
      firstVisibleDate={firstVisibleDate}
      firstDateInGrid={firstDateInGrid}
      cellIdx={cellIdx}
    />
  ));

  const leftArrow = (
    <div className="d-flex align-items-center ms-0 ms-md-3">
      <SVGLeftArrow
        style={{visibility: page > 0 ? 'visible' : 'hidden'}}
        onClick={() => setPage(page - 1)}
      />
    </div>
  );
  const rightArrow = (
    <div className="d-flex align-items-center ms-0 ms-md-3">
      <SVGRightArrow onClick={() => setPage(page + 1)}/>
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
      {daysOfWeekAbbr.map(day => (
        <div key={day} className="daypicker-dayofweek-cell">
          {day}
        </div>
      ))}
    </>
  );
});
