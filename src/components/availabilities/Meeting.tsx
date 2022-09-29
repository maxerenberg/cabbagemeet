import React from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import GenericSpinner from 'components/GenericSpinner';
import NonFocusButton from 'components/NonFocusButton';
import { fetchMeeting } from 'slices/meetingTimes';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';

export default function Meeting() {
  const params = useParams();
  const name = useAppSelector(state => state.meetingTimes.name);
  const fetchMeetingStatus = useAppSelector(state => state.meetingTimes.fetchMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error) ?? 'unknown';
  const dispatch = useAppDispatch();

  // if (true) {
  //   return <GenericSpinner />;
  // }

  if (name === null && fetchMeetingStatus === 'idle') {
    dispatch(fetchMeeting(params.id!));
    return <GenericSpinner />;
  }
  if (fetchMeetingStatus === 'loading') {
    return <GenericSpinner />;
  }
  if (fetchMeetingStatus === 'failed') {
    console.error(error);
    return (
      <div className="d-flex justify-content-center">
        <p>
          An error occurred while fetching the meeting:
          <br />
          {error}
        </p>
      </div>
    );
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
