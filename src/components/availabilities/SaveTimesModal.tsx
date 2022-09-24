import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import { SerializedError } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import NonFocusButton from 'components/NonFocusButton';
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
  const [validated, setValidated] = useState(false);

  // Set overflow:hidden on the body to prevent scrolling
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const onClose = () => {
    closeModal();
    setName('');  // Do we need this??
  };
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    // TODO: handle request result in a useEffect hook instead
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

  const isSubmitting = selMode.type === 'submittingSelf';
  const submitBtnDisabled = isSubmitting || name === '';
  const closeBtnDisabled = isSubmitting;
  const spinner = isSubmitting && <ButtonSpinnerRight />;
  return (
    <div className="saveTimesModal">
      <Form noValidate className="saveTimesModal--content" {...{validated, onSubmit}}>
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
            required
            placeholder="What's your name?"
            className="form-text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            Please enter your name.
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="submitSelfEmail">
          <Form.Label className="form-text-label">Email address (optional)</Form.Label>
          <Form.Control
            type="email"
            placeholder="What's your email address? (optional)"
            className="form-text-input"
          />
          <Form.Control.Feedback type="invalid">
            Please enter a valid email address.
          </Form.Control.Feedback>
        </Form.Group>
        <div className="d-flex align-items-center justify-content-between">
          <div className="already-have-account">
            Already have an account?
          </div>
          <NonFocusButton
            type="submit"
            className="btn btn-primary"
            disabled={submitBtnDisabled}
          >
            Submit {spinner}
          </NonFocusButton>
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
