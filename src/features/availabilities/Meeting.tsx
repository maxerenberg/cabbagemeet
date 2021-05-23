import React, { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useRouteMatch } from 'react-router';
import { getDateFromString, getDayOfWeekAbbr, getMonthAbbrFromDate } from '../daypicker/dateUtils';
import { fetchMeeting } from '../daypicker/meetingTimesSlice';
import AvailabilitiesRow from './AvailabilitiesRow';
import MeetingGridBodyCells from './MeetingGridBodyCells';
import type { Style, DateTimes, PeopleDateTimes } from '../../common/types';
import type { SelModeType, DateTime } from './types';
import { getUserFromSelMode } from './types';
import './Meeting.css';

export default function Meeting() {
  const match: { params: { id: string } } = useRouteMatch();
  const name = useAppSelector(state => state.meetingTimes.name);
  const fetchMeetingStatus = useAppSelector(state => state.meetingTimes.fetchMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const [selMode, setSelMode] = useState<SelModeType>('none');
  const [selectedDateTimes, setSelectedDateTimes] = useState({});
  const dispatch = useAppDispatch();
  if (name === null && fetchMeetingStatus === 'idle') {
    dispatch(fetchMeeting(match.params.id));
    return null;
  }
  if (fetchMeetingStatus === 'failed') {
    console.error(error);
    return <p>An error occurred while fetching the meeting.</p>;
  }
  return (
    <div className="meeting-container">
      <MeetingTitleRow />
      <MeetingAboutRow />
      <AvailabilitiesRow
        selMode={selMode} setSelMode={setSelMode}
        selectedDateTimes={selectedDateTimes} setSelectedDateTimes={setSelectedDateTimes}
      />
      <WeeklyViewTimePicker
        selMode={selMode} setSelMode={setSelMode}
        selectedDateTimes={selectedDateTimes} setSelectedDateTimes={setSelectedDateTimes}
      />
    </div>
  );
}

function MeetingTitleRow() {
  const name = useAppSelector(state => state.meetingTimes.name);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{fontSize: '1.3em'}}>{name}</div>
      <div>
        <button className="meeting-heading-button">Edit</button>
        <button className="meeting-heading-button">Share</button>
      </div>
    </div>
  );
}

function MeetingAboutRow() {
  const about = useAppSelector(state => state.meetingTimes.about);
  if (!about) return null;
  return (
    <div style={{marginTop: '3em', fontSize: '0.8em'}}>
      {about}
    </div>
  );
}

const WeeklyViewTimePicker = React.memo(function WeeklyViewTimePicker({
  selMode, setSelMode, selectedDateTimes, setSelectedDateTimes,
}: {
  selMode: SelModeType,
  setSelMode: (selMode: SelModeType) => void,
  selectedDateTimes: DateTimes,
  setSelectedDateTimes: (dateTimes: DateTimes) => void,
}) {
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
  const [hoverDateTime, setHoverDateTime] = useState<DateTime | null>(null);
  const [hoverUser, setHoverUser] = useState<string | null>(null);
  if (startHour == null || endHour == null || dates === null) return null;
  const numCols = numDaysDisplayed + 1;
  const numRows = (endHour - startHour) * 2;
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
          selMode={selMode}
          selectedDateTimes={selectedDateTimes} setSelectedDateTimes={setSelectedDateTimes}
        />
      </div>
      <MeetingDaysArrows numDates={dates.length} page={page} setPage={setPage} />
      <MeetingRespondents
        availabilities={availabilities}
        hoverDateTime={hoverDateTime} setHoverUser={setHoverUser}
        selMode={selMode} setSelMode={setSelMode}
        setSelectedDateTimes={setSelectedDateTimes}
      />
    </div>
  );
});


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
  numDates, page, setPage,
}: {
  numDates: number, page: number, setPage: (page: number) => void},
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

function MeetingRespondents({
  availabilities, hoverDateTime, setHoverUser, selMode, setSelMode, setSelectedDateTimes,
}: {
  availabilities: PeopleDateTimes, hoverDateTime: DateTime | null,
  setHoverUser: (user: string | null) => void, selMode: SelModeType,
  setSelMode: (selMode: SelModeType) => void,
  setSelectedDateTimes: (dateTimes: DateTimes) => void,
}) {
  const people = Object.keys(availabilities);
  if (people.length === 0) return null;
  const peopleForHover = new Set();
  if (hoverDateTime !== null) {
    const [dateString, time] = hoverDateTime;
    for (const [person, dateTimes] of Object.entries(availabilities)) {
      if (dateTimes[dateString]?.includes(time)) {
        peopleForHover.add(person);
      }
    }
  }
  const numPeopleForHover = Array.from(peopleForHover).length;
  const selectedUser = getUserFromSelMode(selMode);
  return (
    <div className="respondents-container">
      <div style={{
        marginBottom: '2em',
        fontSize: '1.2em',
      }}>
        Respondents (
          {(!selectedUser && hoverDateTime) ? numPeopleForHover + '/' : ''}
          {people.length}
        )
      </div>
      <ul>
        {
          people.map(name => {
            const style: Style = {};
            if (name === selectedUser) {
              style.color = 'forestgreen';
            }
            let className = '';
            if (!selectedUser && hoverDateTime && !peopleForHover.has(name)) {
              className = 'unavailable';
            }
            const onClick = () => {
              if (name === selectedUser) {
                setSelMode('none');
              } else {
                setSelMode(`selectedOther:${name}` as SelModeType);
              }
              setSelectedDateTimes({});
            };
            return (
              <li
                key={name}
                className={className}
                style={style}
                onMouseEnter={() => setHoverUser(name)}
                onMouseLeave={() => setHoverUser(null)}
                onClick={onClick}
              >
                {name}
              </li>
            );
          })
        }
      </ul>
    </div>
  );
}