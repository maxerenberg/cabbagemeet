import { useEffect } from "react";
import { useAppDispatch } from "app/hooks";
import ConfirmationModal from "components/ConfirmationModal";
import { useToast } from "components/Toast";
import { useDeleteUserMutation } from "slices/api";
import { useMutationWithPersistentError } from "utils/requests.utils";

export default function DeleteAccountModal({
  show, setShow
}: {
  show: boolean, setShow: (val: boolean) => void
}) {
  const [deleteAccount, {isSuccess, isLoading, error}] = useMutationWithPersistentError(useDeleteUserMutation);
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
    }
  }, [isSuccess, showToast, dispatch]);

  return (
    <ConfirmationModal
      show={show}
      setShow={setShow}
      onConfirm={onDeleteClick}
      title="Delete Account?"
      bodyText="Are you sure you want to delete your account? This action is irreversible."
      confirmationButtonText="Delete"
      isLoading={isLoading}
      error={error}
    />
  );
};
