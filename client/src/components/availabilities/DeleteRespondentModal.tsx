import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "app/hooks";
import ConfirmationModal from "components/ConfirmationModal";
import { useToast } from "components/Toast";
import { useDeleteRespondentMutation } from "slices/api";
import { resetSelection } from "slices/availabilitiesSelection";
import { selectCurrentMeetingID } from "slices/currentMeeting";
import { assert } from "utils/misc.utils";

export default function DeleteRespondentModal({
  show, setShow, respondentID,
}: {
  show: boolean, setShow: (val: boolean) => void,
  respondentID: number,
}) {
  const meetingID = useAppSelector(selectCurrentMeetingID);
  assert(meetingID !== undefined);
  const dispatch = useAppDispatch();
  const [deleteRespondent, {isSuccess, isLoading, error, reset}] = useDeleteRespondentMutation();
  const { showToast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: `Successfully deleted respondent`,
        msgType: 'success',
        autoClose: true,
      });
      setShow(false);
      dispatch(resetSelection());
    }
  }, [isSuccess, showToast, setShow, dispatch]);

  const onDeleteClick = useCallback(() => {
    deleteRespondent({
      id: meetingID,
      respondentId: respondentID,
    });
  }, [meetingID, respondentID]);

  const setShowWrapper = useCallback((val: boolean) => {
    if (!val) {
      reset();
    }
    setShow(val);
  }, [setShow, reset]);

  return (
    <ConfirmationModal
      show={show}
      setShow={setShowWrapper}
      onConfirm={onDeleteClick}
      title="Delete meeting?"
      bodyText="Are you sure you want to delete this respondent? This action is irreversible."
      confirmationButtonText="Delete"
      isLoading={isLoading}
      error={error}
    />
  );
}
