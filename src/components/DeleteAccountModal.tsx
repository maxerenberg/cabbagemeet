import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "app/hooks";
import ConfirmationModal from "components/ConfirmationModal";
import { useToast } from "components/Toast";
import {
  deleteAccount,
  resetDeleteAccountStatus,
  selectDeleteAccountError,
  selectDeleteAccountState,
} from "slices/authentication";

export default function DeleteAccountModal({onClose}: {onClose: () => void}) {
  const deleteAccountStatus = useAppSelector(selectDeleteAccountState);
  const error = useAppSelector(selectDeleteAccountError);
  const isLoading = deleteAccountStatus === 'loading';
  const dispatch = useAppDispatch();
  const {showToast} = useToast();
  const onDeleteClick = () => dispatch(deleteAccount());

  useEffect(() => {
    if (deleteAccountStatus === 'succeeded') {
      showToast({
        msg: 'Successfully deleted account',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetDeleteAccountStatus());
      // The user will automatically get redirected to / when the userInfo
      // is deleted from the Redux store (see Settings.tsx)
    } else if (deleteAccountStatus === 'failed') {
      showToast({
        msg: `Failed to delete account: ${error?.message ?? 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(resetDeleteAccountStatus());
    }
  }, [deleteAccountStatus, showToast, dispatch, error]);

  return (
    <ConfirmationModal
      onClose={onClose}
      onConfirm={onDeleteClick}
      title="Delete Account?"
      bodyText="Are you sure you want to delete your account? This action is irreversible."
      confirmationButtonText="Delete"
      isLoading={isLoading}
    />
  );
};
