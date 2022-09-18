import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { useParams } from 'react-router-dom';
import NonFocusButton from 'components/NonFocusButton';
import { fetchMeeting } from 'slices/meetingTimes';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';

export default function Meeting() {
  const params = useParams();
  const name = useAppSelector(state => state.meetingTimes.name);
  const fetchMeetingStatus = useAppSelector(state => state.meetingTimes.fetchMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const dispatch = useAppDispatch();

  if (name === null && fetchMeetingStatus === 'idle') {
    dispatch(fetchMeeting(params.id!));
    return <MeetingLoading />;
  }
  if (fetchMeetingStatus === 'loading') {
    return <MeetingLoading />;
  }
  if (fetchMeetingStatus === 'failed') {
    console.error(error);
    return <p>An error occurred while fetching the meeting.</p>;
  }
  return (
    <div className="meeting-container">
      <MeetingTitleRow />
      <MeetingAboutRow />
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
        <NonFocusButton className="btn btn-outline-secondary px-4">Edit</NonFocusButton>
        <NonFocusButton className="btn btn-outline-primary px-4 ms-4">Share</NonFocusButton>
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

function MeetingLoading() {
  return (
    <div className="meeting-loading-container">
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}
