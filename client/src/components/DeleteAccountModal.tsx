import { useEffect } from "react";
import { useAppDispatch } from "app/hooks";
import ConfirmationModal from "components/ConfirmationModal";
import { useToast } from "components/Toast";
import { useDeleteAccount } from "utils/auth.hooks";
import { getReqErrorMessage } from "utils/requests.utils";

export default function DeleteAccountModal({onClose}: {onClose: () => void}) {
  const [deleteAccount, {isSuccess, isLoading, isError, error}] = useDeleteAccount();
  const dispatch = useAppDispatch();
  const {showToast} = useToast();
  const onDeleteClick = () => deleteAccount();

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Successfully deleted account',
        msgType: 'success',
        autoClose: true,
      });
      // The user will automatically get redirected to the homepage when the
      // userInfo is deleted from the Redux store (see Settings.tsx)
    } else if (isError) {
      showToast({
        msg: `Failed to delete account: ${getReqErrorMessage(error)}`,
        msgType: 'failure',
      });
    }
  }, [isSuccess, isError, error, showToast, dispatch]);

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
