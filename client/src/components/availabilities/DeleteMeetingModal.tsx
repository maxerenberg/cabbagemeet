import { useEffect } from "react";
import { useAppSelector } from "app/hooks";
import ConfirmationModal from "components/ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { useToast } from "components/Toast";
import { useDeleteMeetingMutation } from "slices/api";
import { getReqErrorMessage } from "utils/requests.utils";
import { selectCurrentMeetingID } from "slices/currentMeeting";
import { assert } from "utils/misc.utils";

export default function DeleteMeetingModal({
  onClose,
}: {
  onClose: () => void,
}) {
  const meetingID = useAppSelector(selectCurrentMeetingID);
  assert(meetingID !== undefined);
  const [deleteMeeting, {isLoading, isSuccess, isError, error}] = useDeleteMeetingMutation();
  const navigate = useNavigate();
  const {showToast} = useToast();
  const onDeleteClick = () => deleteMeeting(meetingID);

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Successfully deleted meeting',
        msgType: 'success',
        autoClose: true,
      });
      navigate('/');
    } else if (isError) {
      showToast({
        msg: `Failed to delete meeting: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    }
  }, [isSuccess, isError, error, showToast, navigate]);

  return (
    <ConfirmationModal
      onClose={onClose}
      onConfirm={onDeleteClick}
      title="Delete meeting?"
      bodyText="Are you sure you want to delete this meeting? This action is irreversible."
      confirmationButtonText="Delete"
      isLoading={isLoading}
    />
  );
};
