import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import styles from './SubmitAsGuestModal.module.css';
import ButtonWithSpinner from 'components/ButtonWithSpinner';
import { useAddGuestRespondentMutation } from 'slices/api';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { selectSelectedTimes, resetSelection } from 'slices/availabilitiesSelection';
import { selectCurrentMeetingID } from 'slices/currentMeeting';
import { assert } from 'utils/misc.utils';
import { getReqErrorMessage } from 'utils/requests.utils';
import { useToast } from 'components/Toast';

function SaveTimesModal({
  show, setShow
}: {
  show: boolean, setShow: (val: boolean) => void
}) {
  const meetingID = useAppSelector(selectCurrentMeetingID);
  assert(meetingID !== undefined);
  const selectedTimes = useAppSelector(selectSelectedTimes);
  const dispatch = useAppDispatch();
  const [atLeastOneRequestSentSinceLastTimeModalWasOpened, setAtLeastOneRequestSentSinceLastTimeModalWasOpened] = useState(false);
  const [addGuest, {isSuccess, isLoading, error}] = useAddGuestRespondentMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [validated, setValidated] = useState(false);
  const {showToast} = useToast();

  useEffect(() => {
    if (!show) {
      setAtLeastOneRequestSentSinceLastTimeModalWasOpened(false);
    }
  }, [show]);

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Successfully added availabilities',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
      // automatically close the modal if the request succeeds
      setShow(false);
    }
  }, [isSuccess, showToast, dispatch, setShow]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }
    addGuest({
      id: meetingID,
      addGuestRespondentDto: {
        availabilities: Object.keys(selectedTimes),
        name,
        email: email || undefined,
      },
    });
    setAtLeastOneRequestSentSinceLastTimeModalWasOpened(true);
  };
  const onClose = () => {
    if (isLoading) return;
    setShow(false);
  };
  const showError = error !== undefined && atLeastOneRequestSentSinceLastTimeModalWasOpened;

  const submitBtnDisabled = isLoading || name === '';
  return (
    <Modal
      backdrop="static"
      show={show}
      onHide={onClose}
      centered={true}
    >
      <Modal.Header closeButton>
        <Modal.Title>Continue as Guest</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form noValidate id="saveTimesModal" className="my-3" {...{validated, onSubmit}}>
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
          <Form.Group controlId="submitSelfEmail" className="mt-4">
            <Form.Label className="form-text-label">Email address (optional)</Form.Label>
            <Form.Control
              type="email"
              placeholder="What's your email address? (optional)"
              className="form-text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid email address.
            </Form.Control.Feedback>
          </Form.Group>
        </Form>
        <div className={`text-danger text-center ${showError ? '' : 'in'}visible`}>
          Error submitting availabilities: {error ? getReqErrorMessage(error) : ''}
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        <div className={styles.alreadyHaveAccount}>
          Already have an account?
        </div>
        <ButtonWithSpinner
          as="NonFocusButton"
          type="submit"
          form="saveTimesModal"
          className="btn btn-primary"
          disabled={submitBtnDisabled}
          isLoading={isLoading}
        >
          Submit
        </ButtonWithSpinner>
      </Modal.Footer>
    </Modal>
  )
}
export default SaveTimesModal;
