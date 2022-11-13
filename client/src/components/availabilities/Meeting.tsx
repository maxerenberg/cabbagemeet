import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import GenericSpinner from 'components/GenericSpinner';
import NonFocusButton from 'components/NonFocusButton';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';
import EditMeeting from './EditMeeting';
import { useToast } from 'components/Toast';
import { useGetMeetingQuery } from 'slices/enhancedApi';
import { getReqErrorMessage } from 'utils/requests.utils';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { useSelfInfoIsPresent } from 'utils/auth.hooks';

export default function Meeting() {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const params = useParams();
  const meetingID = parseInt(params.id!);
  const skip = isNaN(meetingID);
  const {isError, error} = useGetMeetingQuery(meetingID, {skip});
  // FIXME: this is ugly. What's happening is that there is a delay between
  // when the data is fetched, and when the meetingID is stored in the separate
  // Redux slice.
  // Maybe we should store the meetingID before fetching the data?
  const {secondaryHookIsReady} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({secondaryHookIsReady: !!meeting})
  );

  if (skip) {
    return <p>Meeting ID is invalid.</p>;
  }
  if (isError) {
    return (
      <div className="d-flex justify-content-center">
        <p>
          An error occurred while fetching the meeting:
          <br />
          {getReqErrorMessage(error)}
        </p>
      </div>
    );
  }
  if (!secondaryHookIsReady) {
    return <GenericSpinner />;
  }
  if (isEditingMeeting) {
    return <EditMeeting setIsEditing={setIsEditingMeeting} />;
  }
  return (
    <div className="meeting-container">
      <MeetingTitleRow setIsEditingMeeting={setIsEditingMeeting} />
      <hr className="my-4 my-md-5" />
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
  const {name} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({name: meeting?.name})
  );
  const isLoggedIn = useSelfInfoIsPresent();
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
  const {about} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({about: meeting?.about})
  );
  if (!about) return null;
  return (
    <div style={{marginTop: '3em', fontSize: '0.8em'}}>
      {about}
    </div>
  );
});
