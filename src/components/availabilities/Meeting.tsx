import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import GenericSpinner from 'components/GenericSpinner';
import NonFocusButton from 'components/NonFocusButton';
import { fetchMeeting } from 'slices/meetingTimes';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';
import EditMeeting from './EditMeeting';
import { useToast } from 'components/Toast';
import { selectIsLoggedIn } from 'slices/authentication';
import useEffectOnce from 'utils/useEffectOnce.hook';

export default function Meeting() {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const params = useParams();
  const urlMeetingID = params.id!;
  const fetchedMeetingID = useAppSelector(state => state.meetingTimes.id);
  const fetchMeetingStatus = useAppSelector(state => state.meetingTimes.fetchMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error) ?? 'unknown';
  const dispatch = useAppDispatch();

  const needToFetchMeeting = fetchMeetingStatus === 'idle' || (
    fetchMeetingStatus === 'succeeded' && fetchedMeetingID !== urlMeetingID
  );
  useEffectOnce(() => {
    if (needToFetchMeeting) {
      dispatch(fetchMeeting(urlMeetingID));
    }
  }, [needToFetchMeeting, dispatch, urlMeetingID]);

  if (needToFetchMeeting || fetchMeetingStatus === 'loading') {
    return <GenericSpinner />;
  }
  if (fetchMeetingStatus === 'failed') {
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
  if (isEditingMeeting) {
    return <EditMeeting setIsEditing={setIsEditingMeeting} />;
  }
  return (
    <div className="meeting-container">
      <MeetingTitleRow setIsEditingMeeting={setIsEditingMeeting} />
      <MeetingAboutRow />
      <WeeklyViewTimePicker />
    </div>
  );
}

const MeetingTitleRow = React.memo(function MeetingTitleRow({
  setIsEditingMeeting,
}: {
  setIsEditingMeeting: (val: boolean) => void,
}) {
  const name = useAppSelector(state => state.meetingTimes.name);
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const { showToast } = useToast();
  const onClickEditButton = () => {
    if (isLoggedIn) {
      setIsEditingMeeting(true);
    } else {
      showToast({
        msg: 'You must be logged in to edit a meeting',
        msgType: 'failure',
        autoClose: true,
      });
    }
  };
  return (
    <div className="d-flex align-items-center justify-content-between">
      <div style={{fontSize: '1.3em'}}>{name}</div>
      <div>
        <NonFocusButton
          className="btn btn-outline-secondary px-4"
          onClick={onClickEditButton}
        >
          Edit
        </NonFocusButton>
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
