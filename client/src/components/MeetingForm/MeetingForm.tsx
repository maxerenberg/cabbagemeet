import { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useNavigate } from 'react-router-dom';
import { resetSelectedDates, selectSelectedDates } from 'slices/selectedDates';
import { setVisitedDayPicker } from 'slices/visitedDayPicker';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { useToast } from 'components/Toast';
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
  const visitedDayPicker = useAppSelector(state => state.visitedDayPicker);
  const [createMeeting, {data, isUninitialized, isLoading, isSuccess, isError, error}] = useCreateMeetingMutation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // If the user didn't select any dates, redirect them to the home page.
    //
    // The isUninitialized check is necessary because visitedDayPicker
    // gets reset to false when we call dispatch(setVisitedDayPicker(false)).
    // FIXME: this kind of check shouldn't be necessary, it's too complicated
    if (!visitedDayPicker && isUninitialized) {
      navigate('/');
    }
  }, [navigate, visitedDayPicker, isUninitialized]);

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Successfully created new meeting',
        msgType: 'success',
        autoClose: true,
      });
      // FIXME: we shouldn't need multiple dispatches here...
      dispatch(resetSelectedDates());
      dispatch(setVisitedDayPicker(false));
      navigate('/m/' + data!.meetingID);
    } else if (isError) {
      showToast({
        msg: `Failed to create meeting: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    }
  }, [data, isSuccess, isError, error, dispatch, navigate, showToast]);

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