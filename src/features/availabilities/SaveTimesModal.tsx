import { useState } from 'react';
import './SaveTimesModal.css';
import '../../common/common.css';
import { DateTimes } from '../../common/types';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  resetSubmitAvailabilitiesStatus,
  submitAvailabilities,
} from '../daypicker/meetingTimesSlice';
import { unwrapResult } from '@reduxjs/toolkit';

export function SaveTimesModal(
  { onClose, dateTimes, postSubmit }:
  { onClose: () => void, dateTimes: DateTimes, postSubmit: () => void }
) {
  const dispatch = useAppDispatch();
  const submitStatus = useAppSelector(state => state.meetingTimes.submitAvailabilitiesStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const [user, setUser] = useState('');
  if (submitStatus === 'succeeded') {
    // the modal is about to close
    return null;
  } else if (submitStatus === 'failed') {
    console.error(error);
    const originalOnClose = onClose;
    onClose = () => {
      dispatch(resetSubmitAvailabilitiesStatus());
      originalOnClose();
    };
  }
  const onSubmit = async () => {
    try {
      const resultAction = await dispatch(submitAvailabilities({ user, dateTimes }));
      unwrapResult(resultAction);
      dispatch(resetSubmitAvailabilitiesStatus());
      onClose();
      postSubmit();
    } catch (err) {
      console.error(err);
    }
  };
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
          <button onClick={onClose}>Close</button>
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
            disabled={submitStatus === 'loading' || user === ''}
          >
            Submit
          </button>
        </div>
        {
          submitStatus === 'failed' && (
            <div style={{color: 'red'}}>
              Error submitting availabilities: {error}
            </div>
          )
        }
      </div>
    </div>
  )
}
