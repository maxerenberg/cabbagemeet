import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import Modal from 'components/Modal';
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
  onClose,
}: {
  onClose: () => void,
}) {
  const dispatch = useAppDispatch();
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (selMode.type === 'submittedSelf') {
      showToast({
        msg: 'Availabilities successfully submitted',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
      // automatically close the modal if the request succeeds
      onClose();
    } else if (selMode.type === 'rejectedSelf') {
      setErrorMsg(selMode.error.message || 'error was not specified');
      dispatch(goBackToEditingSelf());
    }
  }, [selMode, showToast, dispatch, onClose]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }
    dispatch(submitSelf(name));
  };

  const isSubmitting = selMode.type === 'submittingSelf';
  const submitBtnDisabled = isSubmitting || name === '';
  const closeBtnDisabled = isSubmitting;
  const spinner = isSubmitting && <ButtonSpinnerRight />;
  return (
    <Modal>
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
    </Modal>
  )
}
export default SaveTimesModal;
