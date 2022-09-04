import React from 'react';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { useParams } from 'react-router-dom';
import { fetchMeeting } from 'slices/meetingTimes';
import AvailabilitiesRow from './AvailabilitiesRow';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';

export default function Meeting() {
  const params = useParams();
  const name = useAppSelector(state => state.meetingTimes.name);
  const fetchMeetingStatus = useAppSelector(state => state.meetingTimes.fetchMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const appDispatch = useAppDispatch();
  if (name === null && fetchMeetingStatus === 'idle') {
    appDispatch(fetchMeeting(params.id!));
    // TODO: show spinner
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
      <AvailabilitiesRow />
      <WeeklyViewTimePicker />
    </div>
  );
}

const MeetingTitleRow = React.memo(function MeetingTitleRow() {
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
});

const MeetingAboutRow = React.memo(function MeetingAboutRow() {
  const about = useAppSelector(state => state.meetingTimes.about);
  if (!about) return null;
  return (
    <div style={{marginTop: '3em', fontSize: '0.8em'}}>
      {about}
    </div>
  );
});
