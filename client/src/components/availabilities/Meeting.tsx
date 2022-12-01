import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import GenericSpinner from 'components/GenericSpinner';
import NonFocusButton from 'components/NonFocusButton';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';
import EditMeeting from './EditMeeting';
import { useGetMeetingQuery } from 'slices/enhancedApi';
import { getReqErrorMessage } from 'utils/requests.utils';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { useSelfInfoIsPresent } from 'utils/auth.hooks';
import { useAppDispatch } from 'app/hooks';
import { setCurrentMeetingID } from 'slices/currentMeeting';
import InfoModal from 'components/InfoModal';
import { useToast } from 'components/Toast';

export default function Meeting() {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const dispatch = useAppDispatch();
  const params = useParams();
  const meetingID = parseInt(params.id!);
  const skip = isNaN(meetingID);
  const {isError, error} = useGetMeetingQuery(meetingID, {skip});

  useEffect(() => {
    dispatch(setCurrentMeetingID(meetingID));
  }, [dispatch, meetingID]);

  // Wait until the data for the current meeting is ready.
  // Since the setCurrentMeetingID call happens asynchronously, the data for
  // a different meeting might still be loaded because the old meetingID is
  // still present in the Redux store. So we need to check the meetingID.
  const {isReady} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({isReady: meeting && meeting.meetingID === meetingID})
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
  if (!isReady) {
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
  const [showMustBeLoggedInModal, setShowMustBeLoggedInModal] = useState(false);
  const [showClipboardFailedModal, setShowClipboardFailedModal] = useState(false);
  const {showToast} = useToast();
  const onClickEditButton = () => {
    if (isLoggedIn) {
      setIsEditingMeeting(true);
    } else {
      setShowMustBeLoggedInModal(true);
    }
  };
  const onClickShareButton = async () => {
    try {
      // Don't include the query parameters, just in case there's something sensitive in there
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
    } catch (err) {
      console.error('Failed to write to clipboard:', err);
      setShowClipboardFailedModal(true);
      return;
    }
    showToast({
      msg: 'Successfully copied URL to clipboard',
      msgType: 'success',
      autoClose: true,
    });
  };
  return (
    <>
      <div className="d-flex align-items-center">
        <div className="me-auto" style={{fontSize: '1.3em'}}>{name}</div>
        <NonFocusButton
          className="btn btn-outline-secondary px-4"
          onClick={onClickEditButton}
        >
          Edit
        </NonFocusButton>
        <NonFocusButton
          className="btn btn-outline-primary px-4 ms-4"
          onClick={onClickShareButton}
        >
          Share
        </NonFocusButton>
      </div>
      <InfoModal show={showMustBeLoggedInModal} setShow={setShowMustBeLoggedInModal}>
        <p className="text-center my-3">You must be logged in to edit a meeting.</p>
      </InfoModal>
      <InfoModal show={showClipboardFailedModal} setShow={setShowClipboardFailedModal}>
        <p className="text-center my-3">Could not write to clipboard. Check the console for details.</p>
      </InfoModal>
    </>
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
