import React, { useMemo, useReducer } from 'react';
import { useAppSelector } from 'app/hooks';
import { LeftArrow as SVGLeftArrow, RightArrow as SVGRightArrow } from 'components/Arrows';
import { getDateFromString, getDayOfWeekAbbr, getMonthAbbrFromDate } from 'utils/dates';
import AvailabilitiesRow from './AvailabilitiesRow';
import MeetingGridBodyCells from './MeetingGridBodyCells';
import MeetingRespondents from './MeetingRespondents';
import { range } from 'utils/arrays';
import { assert } from 'utils/misc';

/**
 * Returns a string which can be used in the CSS grid-template-areas property
 * for the given schedule grid dimensions.
 * @param numSchedRows The number of rows in the schedule grid
 * @param numSchedCols The number of column in the schedule grid
 * @returns A template string with the following area prefix meanings:
 *   e: empty
 *   m: month title
 *   w: week day indicator
 *   t: time (hour)
 *   c: cell of schedule grid
 *   l: left arrow
 *   r: right arrow
 *
 *   e.g.
 *   "e0 e1 m   m   m   m   m   m   m   e2"
 *   "e3 e4 w0  w1  w2  w3  w4  w5  w6  e5"
 *   "l  t0 c0  c1  c2  c3  c4  c5  c6  r"
 *   "l  e6 c7  c8  c9  c10 c11 c12 c13 r"
 *   "l  t1 c14 c15 c16 c17 c18 c19 c20 r"
 */
function generateGridTemplateAreas(numSchedRows: number, numSchedCols: number): string {
  const rows: string[][] = [];
  // monotically increasing counter - areas must be rectangular, so we
  // assign unique area names to each empty cell
  let e = 0;
  // counter for cells in the schedule grid
  let c = 0;

  // First row: month title. It should start at the first column of the schedule grid.
  let row: string[] = [];
  row.push(`e${e++}`);  // for the left arrow column
  row.push(`e${e++}`);  // for the hours column
  for (let i = 0; i < numSchedCols; i++) {
    row.push('m');
  }
  row.push(`e${e++}`);  // for the right arrow column
  rows.push(row);

  // Second row: day of week indicators. They should start at the first column of
  // the schedule grid.
  row = [];
  row.push(`e${e++}`);  // for the left arrow column
  row.push(`e${e++}`);  // for the hours column
  for (let i = 0; i < numSchedCols; i++) {
    row.push(`w${i}`);
  }
  row.push(`e${e++}`);  // for the right arrow column
  rows.push(row);

  // Schedule grid: leftmost column is the times (every other row only).
  for (let i = 0; i < numSchedRows; i++) {
    row = [];
    row.push('l');  // for the left arrow column
    if (i % 2 === 0) {
      row.push(`t${i / 2}`);
    } else {
      row.push(`e${e++}`);
    }
    for (let j = 0; j < numSchedCols; j++) {
      row.push(`c${c++}`);
    }
    row.push('r');  // for the right arrow column
    rows.push(row);
  }

  return rows.map(row => `"${row.join(' ')}"`).join(' ');
}

function pageNumberReducer(page: number, action: 'inc' | 'dec'): number {
  if (action === 'inc') {
    return page + 1;
  } else {
    return page - 1;
  }
}

export default function WeeklyViewTimePicker() {
  const startHour = useAppSelector(state => state.meetingTimes.startTime);
  const endHour = useAppSelector(state => state.meetingTimes.endTime);
  const dates = useAppSelector(state => state.meetingTimes.dates);
  // If the meeting data hasn't been loaded yet, then this component
  // shouldn't even be loaded
  assert(startHour !== null && endHour !== null);
  const [page, pageDispatch] = useReducer(pageNumberReducer, 0);
  const numDaysDisplayed = Math.min(dates.length - page*7, 7);
  const datesDisplayed = useMemo(
    () => dates.slice(page*7, page*7+numDaysDisplayed),
    [dates, page, numDaysDisplayed],
  );
  const numCols = numDaysDisplayed;
  // endHour can be after startHour, e.g. 10 P.M. to 2 A.M. (22 to 2)
  const numRows = 2 * (startHour < endHour ? (endHour - startHour) : (endHour + 24 - startHour));
  const gridTemplateAreas = useMemo(
    () => generateGridTemplateAreas(numRows, numDaysDisplayed),
    [numRows, numDaysDisplayed]
  );
  const moreDaysToLeft = page > 0;
  const moreDaysToRight = dates.length - page*7 > 7;
  return (
    <>
      <AvailabilitiesRow {...{moreDaysToRight, pageDispatch}} />
      <div className="d-md-flex">
        <div
          style={{
            flexGrow: 1,
            display: 'grid',
            /* Column order: left arrow, hours, schedule grid, right arrow */
            gridTemplateColumns: `auto auto repeat(${numDaysDisplayed}, minmax(3em, 1fr)) auto`,
            /* Row order: month title, days of week, schedule grid */
            gridTemplateRows: `auto auto repeat(${numRows}, 1.75em)`,
            gridTemplateAreas,
          }}
          className="weeklyview-grid"
        >
          <MeetingGridMonthTextCell dateStrings={datesDisplayed} />
          <MeetingGridDayOfWeekCells dateStrings={datesDisplayed} />
          <MeetingTimesHoursColumn startHour={startHour} endHour={endHour} />
          <MeetingDaysLeftArrow {...{moreDaysToLeft, pageDispatch}} />
          <MeetingGridBodyCells
            numRows={numRows} numCols={numCols} startHour={startHour}
            dateStrings={datesDisplayed}
          />
          <MeetingDaysRightArrow {...{moreDaysToRight, pageDispatch}} />
        </div>
        <MeetingRespondents />
      </div>
    </>
  );
}

const MeetingGridMonthTextCell = React.memo(function MeetingGridMonthTextCell(
  { dateStrings }: { dateStrings: string[] }
) {
  const startDate = getDateFromString(dateStrings[0]),
        endDate = getDateFromString(dateStrings[dateStrings.length-1]);
  let monthText = getMonthAbbrFromDate(startDate);
  if (endDate.getMonth() !== startDate.getMonth()) {
    monthText += ' \u00A0-\u00A0 ' + getMonthAbbrFromDate(endDate);
  }
  return <div className="weeklyview-grid__monthtext">{monthText}</div>;
});

const MeetingGridDayOfWeekCells = React.memo(function MeetingGridDayOfWeekCells(
  { dateStrings }: { dateStrings: string[] }
) {
  return (
    <>
      {
        dateStrings.map((dateString, i) => {
          const date = getDateFromString(dateString);
          return (
            <div
              key={dateString}
              className="weeklyview__colheadercell"
              style={{gridArea: `w${i}`}}
            >
              <div>{getDayOfWeekAbbr(date).toUpperCase()}</div>
              <div style={{fontSize: '2em'}}>{date.getDate()}</div>
            </div>
          );
        })
      }
    </>
  );
});

const MeetingTimesHoursColumn = React.memo(function MeetingTimesHoursColumn(
  {startHour, endHour}: {startHour: number, endHour: number}
) {
  const hoursDiff = startHour < endHour ? (endHour - startHour) : (endHour + 24 - startHour);
  return (
    <>
      {
        range(hoursDiff).map(i => {
          const hour = (startHour + i) % 24;
          const hourStr = (hour % 12 === 0 ? 12 : hour % 12) + ' ' + (hour < 12 ? 'AM' : 'PM');
          return (
            <div
              key={hour}
              className="weeklyview__hourcell"
              style={{gridArea: `t${i}`}}
            >
              {hourStr}
            </div>
          );
        })
      }
    </>
  );
});

const MeetingDaysLeftArrow = React.memo(function MeetingDaysLeftArrow({
  moreDaysToLeft,
  pageDispatch,
}: {
  moreDaysToLeft: boolean,
  pageDispatch: React.Dispatch<'inc' | 'dec'>,
}) {
  const onClick = () => {
    if (moreDaysToLeft) {
      pageDispatch('dec');
    }
  };
  return (
    <div
      style={{
        visibility: moreDaysToLeft ? 'visible' : 'hidden',
        gridArea: 'l',
      }}
      className="d-flex align-items-center"
    >
      <SVGLeftArrow className="meeting-days-arrow me-2" onClick={onClick} />
    </div>
  );
});

const MeetingDaysRightArrow = React.memo(function MeetingDaysRightArrow({
  moreDaysToRight,
  pageDispatch,
}: {
  moreDaysToRight: boolean,
  pageDispatch: React.Dispatch<'inc' | 'dec'>,
}) {
  const onClick = () => {
    if (moreDaysToRight) {
      pageDispatch('inc');
    }
  };
  return (
    <div
      style={{
        visibility: moreDaysToRight ? 'visible' : 'hidden',
        gridArea: 'r',
      }}
      className="d-flex align-items-center"
    >
      <SVGRightArrow className="meeting-days-arrow ms-2" onClick={onClick} />
    </div>
  );
});
