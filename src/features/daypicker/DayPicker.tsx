import React, { useState } from 'react';
import { addDay, removeDay } from './meetingTimesSlice';
import { daysOfWeek, getMonthAbbr } from './dateUtils';
import './DayPicker.css';
import { getDateString, range } from './dateUtils';
import { useHistory } from 'react-router';
import { useAppSelector, useAppDispatch } from '../../app/hooks';

export default function DayPicker() {
  const history = useHistory();
  return (
    <div>
      <section className="daypicker-main-row">
        <p>On which days would you like to meet?</p>
        <button onClick={() => history.push("/create")}>Let's meet</button>
      </section>
      <section className="daypicker-calendar-container">
        <DayPickerCalendar />
      </section>
    </div>
  );
}

function MonthTitle({
  year, month, setYear, setMonth, today,
}: {
  year: number, month: number, setYear: (year: number) => void,
  setMonth: (month: number) => void, today: Date,
}) {
  const onLeftArrowClick = () => {
    if (month > 0) {
      setMonth(month - 1);
    } else {
      setMonth(11);
      setYear(year - 1);
    }
  };
  const pastCurrentMonth = month > today.getMonth() || year > today.getFullYear();
  const leftArrow = (
    <div
      style={{
        margin: '0 1em',
        visibility: pastCurrentMonth ? 'visible' : 'hidden',
      }}
      className="daypicker-calendar-arrow"
      onClick={onLeftArrowClick}
    >&#10094;</div>
  );
  const onRightArrowClick = () => {
    if (month < 11) {
      setMonth(month + 1);
    } else {
      setMonth(0);
      setYear(year + 1);
    }
  };
  const rightArrow = (
    <div
      style={{margin: '0 1em'}}
      className="daypicker-calendar-arrow"
      onClick={onRightArrowClick}
    >&#10095;</div>
  );
  const monthAbbr = getMonthAbbr(month);
  return (
    <div style={{
      margin: '1.5em 0',
      textTransform: 'uppercase',
      textAlign: 'center',
      fontSize: '1.5em',
      color: 'forestgreen',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {leftArrow}
      {monthAbbr}
      {rightArrow}
    </div>
  )
}

function DayPickerCalendar() {
  const [today] = useState(new Date());
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const firstDayOfMonth = new Date(year, month, 1);
  // Go to the 0th day of the next month, which is actually
  // the last day of this month
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const days = lastDayOfMonth.getDate();
  const padStartDays = firstDayOfMonth.getDay();
  const padEndDays = 6 - lastDayOfMonth.getDay();
  const padStartCells = range(padStartDays).map((i) => (
    <CalendarCell key={-(padStartDays - i - 1)} />
  ));
  const padEndCells = range(padEndDays).map((i) => (
    <CalendarCell key={days + i + 1} />
  ));
  const lessThanToday = (day: number) => (
    month === today.getMonth()
    && year === today.getFullYear()
    && day < today.getDate()
  );
  const monthCells = range(days).map((i) => (
    <CalendarCell
      year={year}
      month={month + 1}
      day={i + 1}
      isDisabled={lessThanToday(i + 1)}
      key={i + 1}
    />
  ));
  
  return (
    <div>
      <MonthTitle
        year={year} month={month} today={today}
        setYear={setYear} setMonth={setMonth}
      />
      <div className="daypicker-calendar">
        <DayOfWeekRow />
        {padStartCells}
        {monthCells}
        {padEndCells}
      </div>
    </div>
  );
}

type NonEmptyCalendarCellProps = {
  year: number,
  month: number,
  day: number,
  isDisabled: boolean,
};
type CalendarCellProps = NonEmptyCalendarCellProps | {};

function isNonEmptyCalendarCellProps(props: CalendarCellProps): props is NonEmptyCalendarCellProps {
  return props.hasOwnProperty('year');
}

function CalendarCell(props: CalendarCellProps) {
  let year: number | undefined,
      month: number | undefined,
      day: number | undefined,
      isDisabled: boolean | undefined;
  let dateString = '';
  if (isNonEmptyCalendarCellProps(props)) {
    year = props.year;
    month = props.month;
    day = props.day;
    isDisabled = props.isDisabled;
    dateString = getDateString(year, month, day);
  }
  const isSelected = useAppSelector(state => state.meetingTimes.dates.includes(dateString));
  
  const dispatch = useAppDispatch();
  const onClick = () => {
    if (!isDisabled) {
      dispatch(isSelected ? removeDay(dateString) : addDay(dateString));
    }
  };
  return (
    <div className="daypicker-calendar__cell">
      {day && (
        <div
          className={"daypicker-calendar__cell__button " + (
            isDisabled ? "disabled" : (isSelected ? "selected" : " unselected")
          )}
          onClick={onClick}
        >
          {day}
        </div>
      )}
    </div>
  );
}

function DayOfWeekRow() {
  return (
    <>
      {daysOfWeek.map(day => (
        <div key={day} style={{textAlign: 'center'}}>{day}</div>
      ))}
    </>
  );
}
