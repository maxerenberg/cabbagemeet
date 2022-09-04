import React, { useState, useMemo } from 'react';
import { useAppSelector } from 'app/hooks';
import { getDateFromString, getDayOfWeekAbbr, getMonthAbbrFromDate } from 'utils/dates';
import MeetingGridBodyCells from './MeetingGridBodyCells';
import MeetingRespondents from './MeetingRespondents';

export default function WeeklyViewTimePicker() {
  const startHour = useAppSelector(state => state.meetingTimes.startTime);
  const endHour = useAppSelector(state => state.meetingTimes.endTime);
  const dates = useAppSelector(state => state.meetingTimes.dates);
  const availabilities = useAppSelector(state => state.meetingTimes.availabilities);
  const [page, setPage] = useState(0);
  const numDaysDisplayed = Math.min(dates.length - page*7, 7);
  const datesDisplayed = useMemo(
    () => dates.slice(page*7, page*7+numDaysDisplayed),
    [dates, page, numDaysDisplayed],
  );
  const [hoverDateTime, setHoverDateTime] = useState<string | null>(null);
  const [hoverUser, setHoverUser] = useState<string | null>(null);
  if (startHour == null || endHour == null || dates === null) return null;
  const numCols = numDaysDisplayed + 1;
  // endHour can be after startHour, e.g. 10 P.M. to 2 A.M. (22 to 2)
  const numRows = 2 * (startHour < endHour ? (endHour - startHour) : (endHour + 24 - startHour));
  return (
    <div style={{position: 'relative', display: 'flex', flexWrap: 'wrap'}}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${numCols-1}, minmax(3em, 1fr))`,
          gridTemplateRows: `auto auto repeat(${numRows}, 2em)`,
          flexGrow: 1,
        }}
        className="weeklyview-grid"
      >
        <MeetingGridMonthTextCell dateStrings={datesDisplayed} />
        <MeetingGridDayOfWeekCells dateStrings={datesDisplayed} />
        <MeetingGridBodyCells
          numRows={numRows} numCols={numCols} startHour={startHour}
          dateStrings={datesDisplayed} availabilities={availabilities}
          setHoverDateTime={setHoverDateTime} hoverUser={hoverUser}
        />
      </div>
      <MeetingDaysArrows numDates={dates.length} page={page} setPage={setPage} />
      <MeetingRespondents
        availabilities={availabilities}
        hoverDateTime={hoverDateTime} setHoverUser={setHoverUser}
      />
    </div>
  );
}

const MeetingGridDayOfWeekCells = React.memo(function MeetingGridDayOfWeekCells(
  { dateStrings }: { dateStrings: string[] }
) {
  return (
    <React.Fragment>
      {/* empty cell in the top left corner */}
      <div></div>
      {
        dateStrings.map(dateString => {
          const date = getDateFromString(dateString);
          const content = (
            <React.Fragment>
              <div>{getDayOfWeekAbbr(date).toUpperCase()}</div>
              <div style={{fontSize: '2em'}}>{date.getDate()}</div>
            </React.Fragment>
          );
          return <div key={dateString} className="weeklyview__colheadercell">{content}</div>;
        })
      }
    </React.Fragment>
  );
});

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

const MeetingDaysArrows = React.memo(function MeetingDaysArrows({
  numDates,
  page,
  setPage,
}: {
  numDates: number,
  page: number,
  setPage: (page: number) => void},
) {
  const moreDaysToRight = numDates - page*7 > 7;
  const onRightArrowClick = () => {
    if (moreDaysToRight) {
      setPage(page + 1);
    }
  };
  const rightArrow = (
    <div
      style={{left: '100%', marginLeft: '0.5em'}}
      className="meeting-days-arrow"
      onClick={onRightArrowClick}
    >
      &#10097;
    </div>
  );
  const moreDaysToLeft = page > 0;
  const onLeftArrowClick = () => {
    if (moreDaysToLeft) {
      setPage(page - 1);
    }
  };
  const leftArrow = (
    <div
      style={{right: '100%', marginRight: '0.5em'}}
      className="meeting-days-arrow"
      onClick={onLeftArrowClick}
    >
      &#10096;
    </div>
  );
  return (
    <React.Fragment>
      {moreDaysToLeft && leftArrow}
      {moreDaysToRight && rightArrow}
    </React.Fragment>
  );
});
