import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "app/hooks";
import { deleteMeeting, resetDeleteMeetingStatus } from "slices/meetingTimes";
import ButtonSpinnerRight from "components/ButtonSpinnerRight";
import Modal from "components/Modal";
import styles from './DeleteMeetingModal.module.css';
import { useNavigate } from "react-router-dom";
import { useToast } from "components/Toast";

export default function DeleteMeetingModal({
  onClose,
}: {
  onClose: () => void,
}) {
  const meetingID = useAppSelector(state => state.meetingTimes.id!);
  const deleteMeetingStatus = useAppSelector(state => state.meetingTimes.deleteMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const isDeleteLoading = deleteMeetingStatus === 'loading';
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {showToast} = useToast();
  const onDeleteClick = () => dispatch(deleteMeeting(meetingID));
  const deleteButtonSpinner = isDeleteLoading && <ButtonSpinnerRight />;

  useEffect(() => {
    if (deleteMeetingStatus === 'succeeded') {
      showToast({
        msg: 'Successfully deleted meeting',
        msgType: 'success',
        autoClose: true,
      });
      // This is racy because resetDeleteMeetingStatus causes the Meeting
      // component to unmount this modal (because it wants to show the spinner).
      // TODO: maybe it would be better to handle this case in the Meeting
      // component itself?
      dispatch(resetDeleteMeetingStatus());
      navigate('/me');
    } else if (deleteMeetingStatus === 'failed') {
      showToast({
        msg: `Failed to delete meeting: ${error || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(resetDeleteMeetingStatus());
    }
  }, [deleteMeetingStatus, showToast, dispatch, navigate, error]);

  return (
    <Modal className={styles.modal}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="fs-4">
          Delete meeting?
        </div>
        <button
          type="button"
          className={styles.close_icon_button}
          onClick={onClose}
          disabled={isDeleteLoading}
        >
          <CloseIcon />
        </button>
      </div>
      <p className="mt-4">
        Are you sure you want to delete this meeting? You will not be
        able to recover it later.
      </p>
      <div className="d-flex justify-content-end mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary px-4"
          onClick={onClose}
          disabled={isDeleteLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-outline-primary ms-4 px-4"
          onClick={onDeleteClick}
          disabled={isDeleteLoading}
        >
          Delete {deleteButtonSpinner}
        </button>
      </div>
    </Modal>
  );
};

function CloseIcon() {
  // Adapted from https://icons.getbootstrap.com/icons/x-circle/
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
    </svg>
  );
}
