import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { selectVisitedDayPicker } from 'slices/selectedDates';
import { createMeeting, resetCreateMeetingStatus } from 'slices/meetingTimes';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import './MeetingForm.css';
import MeetingNamePrompt from './MeetingNamePrompt';
import MeetingAboutPrompt from './MeetingAboutPrompt';
import MeetingTimesPrompt from './MeetingTimesPrompt';

export default function MeetingForm() {
  const [meetingName, setMeetingName] = useState('');
  const [meetingAbout, setMeetingAbout] = useState('');
  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime] = useState(17);
  const dispatch = useAppDispatch();
  const visitedDayPicker = useAppSelector(selectVisitedDayPicker);
  const createMeetingStatus = useAppSelector(state => state.meetingTimes.createMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const navigate = useNavigate();

  useEffect(() => {
    if (!visitedDayPicker) {
      // If the user didn't select any dates, redirect them to the home page
      navigate('/');
    }
  }, [navigate, visitedDayPicker]);

  if (createMeetingStatus === 'succeeded') {
    // we're about to switch to a different URL
    return null;
  } else if (createMeetingStatus === 'failed') {
    return (
      <div className="create-meeting-page">
        An error occurred while creating the meeting: {error}
      </div>
    );
  }
  const onSubmit = async () => {
    try {
      const payload = await dispatch(createMeeting({
        startTime,
        endTime,
        name: meetingName,
        about: meetingAbout,
      })).unwrap();
      const meetingID = payload.id;
      dispatch(resetCreateMeetingStatus());
      navigate('/m/' + meetingID);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="create-meeting-page">
      <MeetingNamePrompt
        meetingName={meetingName}
        setMeetingName={setMeetingName}
        onSubmit={onSubmit}
        isLoading={createMeetingStatus === 'loading'}
      />
      <MeetingAboutPrompt
        meetingAbout={meetingAbout}
        setMeetingAbout={setMeetingAbout}
      />
      <MeetingTimesPrompt
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
      />
    </div>
  );
}
