import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import Modal from 'react-bootstrap/Modal';
import { getReqErrorMessage } from "utils/requests.utils";
import ButtonWithSpinner from "./ButtonWithSpinner";

export default function ConfirmationModal({
  show,
  setShow,
  onConfirm,
  title,
  bodyText,
  confirmationButtonText,
  isLoading,
  error,
  reset,
}: {
  show: boolean,
  setShow: (val: boolean) => void,
  onConfirm: () => void,
  title: string,
  bodyText: string,
  confirmationButtonText: string,
  isLoading: boolean,
  error: FetchBaseQueryError | SerializedError | undefined,
  reset: () => void,
}) {
  const onClose = () => {
    if (isLoading) return;
    reset();
    setShow(false);
  };

  return (
    <Modal
      backdrop="static"
      show={show}
      onHide={onClose}
      centered={true}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="my-3">{bodyText}</p>
        {error && (
          <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
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
      </Modal.Footer>
    </Modal>
  );
};
