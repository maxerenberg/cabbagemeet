import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import { SerializedError } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import {
  selectSelModeAndDateTimes,
  goBackToEditingSelf,
  resetSelection,
  submitSelf,
} from 'slices/availabilitiesSelection';
import { useToast } from 'components/Toast';
import './SaveTimesModal.css';

function SaveTimesModal({
  closeModal,
}: {
  closeModal: () => void,
}) {
  const dispatch = useAppDispatch();
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Set overflow:hidden on the body to prevent scrolling
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const onClose = () => {
    closeModal();
    setName('');
  };
  const onSubmit = async () => {
    try {
      await dispatch(submitSelf(name));
    } catch (anyError: any) {
      const error = anyError as SerializedError;
      console.error('Modal: submission failed:', error.message);
      setErrorMsg(error.message || 'error was not specified');
      dispatch(goBackToEditingSelf());
      return;
    }
    // automatically close the modal if the request succeeds
    onClose();
    dispatch(resetSelection());
    showToast({
      msg: 'Availabilities successfully submitted',
      msgType: 'success',
      autoClose: true,
    });
  };

  // TODO: form validation

  // TODO: show spinner if waiting for server response
  const submitBtnDisabled = selMode.type === 'submittingSelf' || name === '';
  const closeBtnDisabled = selMode.type === 'submittingSelf';
  return (
    <div className="saveTimesModal">
      <Form className="saveTimesModal--content">
        <div className="d-flex justify-content-between">
          <div className="fs-4">
            Continue as Guest
          </div>
          <button
            type="button"
            className="btn btn-outline-primary px-3"
            onClick={onClose}
            disabled={closeBtnDisabled}
          >
            Close
          </button>
        </div>
        <Form.Group controlId="submitSelfName">
          <Form.Label className="form-text-label">Name</Form.Label>
          <Form.Control
            placeholder="What's your name?"
            className="form-text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Group>
        <Form.Group controlId="submitSelfEmail">
          <Form.Label className="form-text-label">Email address (optional)</Form.Label>
          <Form.Control
            placeholder="What's your email address? (optional)"
            className="form-text-input"
          />
        </Form.Group>
        <div className="d-flex align-items-center justify-content-between">
          <div className="already-have-account">
            Already have an account?
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={submitBtnDisabled}
          >
            Submit
          </button>
        </div>
        {
          errorMsg && (
            <div style={{color: 'var(--custom-danger)'}}>
              Error submitting availabilities: {errorMsg}
            </div>
          )
        }
      </Form>
    </div>
  )
}
export default SaveTimesModal;
