import React from 'react';
import Modal from 'react-bootstrap/Modal';

export default function InfoModal({
  show, setShow, children
}: React.PropsWithChildren<{
  show: boolean, setShow: (val: boolean) => void
}>) {
  const onClose = () => setShow(false);
  return (
    <Modal
      backdrop="static"
      show={show}
      onHide={onClose}
      centered={true}
    >
      <Modal.Header closeButton className="border-bottom-0"></Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer className="border-top-0">
        <button
          type="button"
          className="btn btn-outline-secondary custom-btn-min-width"
          onClick={onClose}
        >
          OK
        </button>
      </Modal.Footer>
    </Modal>
  );
}
