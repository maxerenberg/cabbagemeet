import { useState, useContext } from 'react';
import { SerializedError } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import {
  selectSelModeAndDateTimes,
  goBackToEditingSelf,
  cancelSelection,
  submitSelf,
} from 'slices/availabilitiesSelection';
import { toastContext } from 'features/toast/Toast';
import 'common/common.css';
import './SaveTimesModal.css';

function SaveTimesModal({
  closeModal,
}: {
  closeModal: () => void,
}) {
  const dispatch = useAppDispatch();
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const { showToast } = useContext(toastContext);
  const [user, setUser] = useState('');
  // TODO: show spinner if waiting for server response
  const submitBtnDisabled = selMode.type === 'submittingSelf' || user === '';
  const closeBtnDisabled = selMode.type === 'submittingSelf';
  const onClose = () => {
    closeModal();
    setUser('');
  };
  const onSubmit = async () => {
    try {
      await dispatch(submitSelf(user));
    } catch (anyError: any) {
      const error = anyError as SerializedError;
      console.error('Modal: submission failed:', error.message);
      setErrorMsg(error.message || 'error was not specified');
      dispatch(goBackToEditingSelf());
      return;
    }
    // automatically close the modal if the request succeeds
    onClose();
    // reset the selection mode
    dispatch(cancelSelection());
    showToast({
      msg: 'Availabilities successfully submitted',
      msgType: 'success',
    });
  };
  const [errorMsg, setErrorMsg] = useState('');

  return (
    <div className="saveTimesModal">
      <div className="saveTimesModal--content">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '1.5em',
          }}>
            Continue as Guest
          </div>
          <button onClick={onClose} disabled={closeBtnDisabled}>Close</button>
        </div>
        <div>
          <label htmlFor="submitSelfName" className="form-text-label">Name</label>
          <br />
          <input
            id="submitSelfName"
            placeholder="What's your name?"
            className="saveTimesModal--input form-text-input"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="submitSelfName" className="form-text-label">Email address (optional)</label>
          <br />
          <input
            id="submitSelfEmail"
            placeholder="What's your email address? (optional)"
            className="saveTimesModal--input form-text-input"
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <div className="already-have-account">
            Already have an account?
          </div>
          <button
            onClick={onSubmit}
            disabled={submitBtnDisabled}
          >
            Submit
          </button>
        </div>
        {
          errorMsg && (
            <div style={{color: 'red'}}>
              Error submitting availabilities: {errorMsg}
            </div>
          )
        }
      </div>
    </div>
  )
}
export default SaveTimesModal;
