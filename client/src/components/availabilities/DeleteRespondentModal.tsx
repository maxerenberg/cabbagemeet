import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "app/hooks";
import ConfirmationModal from "components/ConfirmationModal";
import { useDeleteRespondentMutation } from "slices/api";
import { resetSelection } from "slices/availabilitiesSelection";
import { selectCurrentMeetingID } from "slices/currentMeeting";
import { assert } from "utils/misc.utils";
import { useMutationWithPersistentError } from "utils/requests.utils";

export default function DeleteRespondentModal({
  show, setShow, respondentID,
}: {
  show: boolean, setShow: (val: boolean) => void,
  respondentID: number,
}) {
  const meetingID = useAppSelector(selectCurrentMeetingID);
  assert(meetingID !== undefined);
  const dispatch = useAppDispatch();
  const [deleteRespondent, {isSuccess, isLoading, error, reset}] = useMutationWithPersistentError(useDeleteRespondentMutation);

  useEffect(() => {
    if (isSuccess) {
      setShow(false);
      dispatch(resetSelection());
    }
  }, [isSuccess, setShow, dispatch]);

  const onDeleteClick = useCallback(() => {
    deleteRespondent({
      id: meetingID,
      respondentId: respondentID,
    });
  }, [deleteRespondent, meetingID, respondentID]);

  return (
    <ConfirmationModal
      show={show}
      setShow={setShow}
      onConfirm={onDeleteClick}
      title="Delete respondent?"
      bodyText="Are you sure you want to delete this respondent? This action is irreversible."
      confirmationButtonText="Delete"
      isLoading={isLoading}
      error={error}
      reset={reset}
    />
  );
}
