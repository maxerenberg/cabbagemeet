import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "app/hooks";
import { deleteMeeting, resetDeleteMeetingStatus } from "slices/meetingTimes";
import ConfirmationModal from "components/ConfirmationModal";
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
    <ConfirmationModal
      onClose={onClose}
      onConfirm={onDeleteClick}
      title="Delete meeting?"
      bodyText="Are you sure you want to delete this meeting? This action is irreversible."
      confirmationButtonText="Delete"
      isLoading={isDeleteLoading}
    />
  );
};
