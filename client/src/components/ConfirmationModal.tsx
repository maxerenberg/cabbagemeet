import Modal from "components/Modal";
import ButtonWithSpinner from "./ButtonWithSpinner";
import styles from './ConfirmationModal.module.css';

export default function ConfirmationModal({
  onClose,
  onConfirm,
  title,
  bodyText,
  confirmationButtonText,
  isLoading,
}: {
  onClose: () => void,
  onConfirm: () => void,
  title: string,
  bodyText: string,
  confirmationButtonText: string,
  isLoading: boolean,
}) {
  return (
    <Modal className={styles.modal}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="fs-4">{title}</div>
        <button
          type="button"
          className={styles.close_icon_button}
          onClick={onClose}
          disabled={isLoading}
        >
          <CloseIcon />
        </button>
      </div>
      <p className="mt-4">{bodyText}</p>
      <div className="d-flex justify-content-end mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary custom-btn-min-width"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </button>
        <ButtonWithSpinner
          className="btn btn-outline-primary ms-4"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmationButtonText}
        </ButtonWithSpinner>
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
