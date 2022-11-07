import { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useNavigate } from 'react-router-dom';
import { resetSelectedDates } from 'slices/selectedDates';
import { createMeeting, resetCreateMeetingStatus } from 'slices/meetingTimes';
import { setVisitedDayPicker } from 'slices/visitedDayPicker';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { useToast } from 'components/Toast';
import './MeetingForm.css';
import MeetingNamePrompt from './MeetingNamePrompt';
import MeetingAboutPrompt from './MeetingAboutPrompt';
import MeetingTimesPrompt from './MeetingTimesPrompt';
import { assert } from 'utils/misc.utils';

export default function MeetingForm() {
  const [meetingName, setMeetingName] = useState('');
  const [meetingAbout, setMeetingAbout] = useState('');
  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime] = useState(17);
  const dispatch = useAppDispatch();
  const visitedDayPicker = useAppSelector(state => state.visitedDayPicker);
  const createMeetingStatus = useAppSelector(state => state.meetingTimes.createMeetingStatus);
  const createMeetingError = useAppSelector(state => state.meetingTimes.error);
  const createdMeetingID = useAppSelector(state => state.meetingTimes.id);
  const error = useAppSelector(state => state.meetingTimes.error);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // If the user didn't select any dates, redirect them to the home page.
    //
    // The createdMeetingID === null check is necessary because visitedDayPicker
    // gets reset to false when we call dispatch(setVisitedDayPicker(false)).
    // FIXME: this kind of check shouldn't be necessary, it's too complicated
    if (!visitedDayPicker && createdMeetingID === null) {
      navigate('/');
    }
  }, [navigate, visitedDayPicker, createdMeetingID]);

  useEffect(() => {
    if (createMeetingStatus === 'succeeded') {
      // sanity check
      assert(createdMeetingID !== null);
      showToast({
        msg: 'Successfully created new meeting',
        msgType: 'success',
        autoClose: true,
      });
      // FIXME: we shouldn't need multiple dispatches here...
      dispatch(resetCreateMeetingStatus());
      dispatch(resetSelectedDates());
      dispatch(setVisitedDayPicker(false));
      navigate('/m/' + createdMeetingID);
    } else if (createMeetingStatus === 'failed') {
      showToast({
        msg: `Failed to create meeting: ${createMeetingError || 'unknown'}`,
        msgType: 'failure',
        autoClose: true,
      });
      dispatch(resetCreateMeetingStatus());
    }
  }, [createMeetingStatus, createdMeetingID, createMeetingError, dispatch, navigate, showToast]);

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
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    if (meetingName === '') {
      // TODO: use form validation to provide visual feedback
      return;
    }
    dispatch(createMeeting({
      startTime,
      endTime,
      name: meetingName,
      about: meetingAbout,
    }));
  };
  return (
    <Form className="create-meeting-page" onSubmit={onSubmit}>
      <MeetingNamePrompt
        meetingName={meetingName}
        setMeetingName={setMeetingName}
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
    </Form>
  );
}
