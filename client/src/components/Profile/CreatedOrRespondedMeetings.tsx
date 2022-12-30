import { Link } from "react-router-dom";
import GenericSpinner from 'components/GenericSpinner';
import { useGetCreatedMeetingsQuery, useGetRespondedMeetingsQuery } from 'slices/enhancedApi';
import {
  addDaysToDateString,
  convertDateTimeStringToHourDecimal,
  getLocalYearMonthDayFromDate,
  getMonthAbbr,
  getYearMonthDayFromDateString,
  to12HourClock,
  tzAbbr,
} from "utils/dates.utils";
import { getReqErrorMessage } from "utils/requests.utils";
import type { TransformedMeetingShortResponse } from "utils/response-transforms";
import styles from './Profile.module.css';

export default function CreatedMeetings({showCreatedMeetings}: {showCreatedMeetings: boolean}) {
  const createdMeetingsReqInfo = useGetCreatedMeetingsQuery(undefined, {skip: !showCreatedMeetings});
  const respondedMeetingsReqInfo = useGetRespondedMeetingsQuery(undefined, {skip: showCreatedMeetings});
  const {
    data,
    isError,
    error,
  } = showCreatedMeetings ? createdMeetingsReqInfo : respondedMeetingsReqInfo;

  if (isError) {
    // TODO: add a Retry button
    return (
      <p className="my-auto">
        An error occurred: {getReqErrorMessage(error!)}
      </p>
    );
  } else if (!data) {
    return <GenericSpinner />;
  }
  const {meetings} = data;

  if (meetings.length === 0) {
    return (
      <div className="my-auto">
        <p className="mb-0 text-center">
          You haven't {showCreatedMeetings ? 'created' : 'responded to'} any meetings yet.
        </p>
        {
          showCreatedMeetings && (
            <Link to="/" className="d-block mt-4 text-decoration-none">
              <button className="btn btn-primary d-block mx-auto">
                Create a meeting
              </button>
            </Link>
          )
        }
      </div>
    );
  }

  return (
    <>
    {
      meetings.map(meeting => (
        <Link
          key={meeting.meetingID}
          to={`/m/${meeting.meetingID}`}
          className={`text-decoration-none rounded p-3 p-md-4 p-lg-5 mt-5 d-flex ${styles.meetingCard}`}
        >
          <ScheduleInfo meeting={meeting} />
          <div className={`ps-4 ${styles.meetingCardRight}`}>
            <h5>{meeting.name}</h5>
            {
              (meeting.scheduledStartDateTime === undefined) && (
                <div className="d-flex align-items-start">
                  {/*
                    Wrap the SVG in a div so that it's aligned on the same baseline
                    as the text in the adjacent div (Bootstrap sets vertical-align: middle
                    on svg and img elements)
                  */}
                  <div><CalendarIcon /></div>
                  <div className="ms-2">
                    {meetingDatesRangeString(meeting.tentativeDates)}
                  </div>
                </div>
              )
            }
            <div className="d-flex align-items-start">
              <div><ClockIcon /></div>
              <div className="ms-2">
                {meetingTimesRangeString(meeting)}
              </div>
            </div>
            <div>
              <GlobeIcon />
              <span className="ms-2">
                {tzAbbr}
              </span>
            </div>
          </div>
        </Link>
      ))
    }
    </>
  );
};

function ScheduleInfo({meeting}: {meeting: TransformedMeetingShortResponse}) {
  if (!meeting.scheduledStartDateTime) {
    return (
      <p className={"my-auto pe-3 pe-md-4 " + styles.notScheduledText}>
        Not scheduled
      </p>
    );
  }
  const [year, month, day] = getLocalYearMonthDayFromDate(new Date(meeting.scheduledStartDateTime));
  return (
    <div className="my-auto ps-4 pe-5 d-flex flex-column align-items-center">
      <span>{getMonthAbbr(month - 1)}</span>
      <span className="fs-3">{day}</span>
      <span>{year}</span>
    </div>
  );
}

function shortDateString(date: string): string {
  const [, month, day] = getYearMonthDayFromDateString(date);
  return getMonthAbbr(month - 1, false) + ' ' + day;
}

function meetingDatesRangeString(dates: string[]): string {
  // dates should already be sorted
  let isContiguous = true;
  for (let i = 0; i + 1 < dates.length; i++) {
    if (addDaysToDateString(dates[i], 1) !== dates[i+1]) {
      isContiguous = false;
      break;
    }
  }
  const separator = isContiguous ? '-' : '~';
  return `${shortDateString(dates[0])} ${separator} ${shortDateString(dates[dates.length-1])}`;
}

// hour must be a multiple of 0.25
function shortTimeString(hour: number): string {
  const HH = String(to12HourClock(Math.floor(hour)));
  const mm = String(60 * (hour - Math.floor(hour))).padStart(2, '0');
  const amOrPm = hour < 12 ? 'am' : 'pm';
  return `${HH}:${mm} ${amOrPm}`;
}

function meetingTimesRangeString(meeting: TransformedMeetingShortResponse): string {
  let startHour: number | undefined;
  let endHour: number | undefined;
  if (meeting.scheduledStartDateTime !== undefined && meeting.scheduledEndDateTime !== undefined) {
    startHour = convertDateTimeStringToHourDecimal(meeting.scheduledStartDateTime);
    endHour = convertDateTimeStringToHourDecimal(meeting.scheduledEndDateTime);
  } else {
    startHour = meeting.minStartHour;
    endHour = meeting.maxEndHour;
  }
  return `${shortTimeString(startHour)} - ${shortTimeString(endHour)}`;
}

function CalendarIcon() {
  // Copied from https://icons.getbootstrap.com/icons/calendar3/
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z"/>
      <path d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
    </svg>
  );
}

function ClockIcon() {
  // Copied from https://icons.getbootstrap.com/icons/clock/
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
    </svg>
  );
}

function GlobeIcon() {
  // Copied from https://icons.getbootstrap.com/icons/globe2/
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855-.143.268-.276.56-.395.872.705.157 1.472.257 2.282.287V1.077zM4.249 3.539c.142-.384.304-.744.481-1.078a6.7 6.7 0 0 1 .597-.933A7.01 7.01 0 0 0 3.051 3.05c.362.184.763.349 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9.124 9.124 0 0 1-1.565-.667A6.964 6.964 0 0 0 1.018 7.5h2.49zm1.4-2.741a12.344 12.344 0 0 0-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332zM8.5 5.09V7.5h2.99a12.342 12.342 0 0 0-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.612 13.612 0 0 1 7.5 10.91V8.5H4.51zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741H8.5zm-3.282 3.696c.12.312.252.604.395.872.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a6.696 6.696 0 0 1-.598-.933 8.853 8.853 0 0 1-.481-1.079 8.38 8.38 0 0 0-1.198.49 7.01 7.01 0 0 0 2.276 1.522zm-1.383-2.964A13.36 13.36 0 0 1 3.508 8.5h-2.49a6.963 6.963 0 0 0 1.362 3.675c.47-.258.995-.482 1.565-.667zm6.728 2.964a7.009 7.009 0 0 0 2.275-1.521 8.376 8.376 0 0 0-1.197-.49 8.853 8.853 0 0 1-.481 1.078 6.688 6.688 0 0 1-.597.933zM8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855.143-.268.276-.56.395-.872A12.63 12.63 0 0 0 8.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.963 6.963 0 0 0 14.982 8.5h-2.49a13.36 13.36 0 0 1-.437 3.008zM14.982 7.5a6.963 6.963 0 0 0-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008h2.49zM11.27 2.461c.177.334.339.694.482 1.078a8.368 8.368 0 0 0 1.196-.49 7.01 7.01 0 0 0-2.275-1.52c.218.283.418.597.597.932zm-.488 1.343a7.765 7.765 0 0 0-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"/>
    </svg>
  );
}
