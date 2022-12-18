import { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useNavigate } from 'react-router-dom';
import { resetSelectedDates, selectSelectedDates } from 'slices/selectedDates';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import './MeetingForm.css';
import MeetingNamePrompt from './MeetingNamePrompt';
import MeetingAboutPrompt from './MeetingAboutPrompt';
import MeetingTimesPrompt from './MeetingTimesPrompt';
import { useCreateMeetingMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';
import { ianaTzName } from 'utils/dates.utils';

export default function MeetingForm() {
  const [meetingName, setMeetingName] = useState('');
  const [meetingAbout, setMeetingAbout] = useState('');
  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime] = useState(17);
  const dispatch = useAppDispatch();
  const dates = useAppSelector(selectSelectedDates);
  const [createMeeting, {data, isLoading, isSuccess, error}] = useCreateMeetingMutation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSuccess) {
      dispatch(resetSelectedDates());
      navigate('/m/' + data!.meetingID);
    }
  }, [data, isSuccess, dispatch, navigate]);

  if (isSuccess) {
    // we're about to switch to a different URL
    return null;
  }
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    if (meetingName === '') {
      // TODO: use form validation to provide visual feedback
      return;
    }
    createMeeting({
      name: meetingName,
      about: meetingAbout,
      timezone: ianaTzName,
      minStartHour: startTime,
      maxEndHour: endTime,
      tentativeDates: Object.keys(dates),
    });
  };
  return (
    <Form className="create-meeting-page" onSubmit={onSubmit}>
      <MeetingNamePrompt
        meetingName={meetingName}
        setMeetingName={setMeetingName}
        isLoading={isLoading}
      />
      {error && (
        <p className="text-danger text-center mt-3">An error occurred: {getReqErrorMessage(error)}</p>
      )}
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
