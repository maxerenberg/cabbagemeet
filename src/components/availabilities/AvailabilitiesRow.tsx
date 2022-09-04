import React, { useState, useCallback, useContext } from 'react';
import { SerializedError } from '@reduxjs/toolkit';
import {
  selectSelModeAndDateTimes,
  cancelSelection,
  editSelf,
  goBackToEditingOther,
  editOther,
  submitOther,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SaveTimesModal from './SaveTimesModal';
import { toastContext } from 'features/toast/Toast';
import { assertIsNever } from 'utils/misc';

function AvailabilitiesRow() {
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const dispatch = useAppDispatch();
  const { toast, showToast } = useContext(toastContext);
  const [shouldShowModal, setShouldShowModal] = useState(false);
  let avlBtnText = 'internal error';
  let onAvlBtnClick: React.MouseEventHandler | undefined;
  let avlBtnDisabled = false;
  const onCancelBtnClick = () => dispatch(cancelSelection());

  if (selMode.type === 'none') {
    avlBtnText = 'Add availability';
    onAvlBtnClick = () => dispatch(editSelf());
  } else if (selMode.type === 'editingSelf') {
    avlBtnText = 'Continue';
    onAvlBtnClick = () => setShouldShowModal(true);
  } else if (selMode.type === 'editingOther') {
    avlBtnText = 'Save';
    onAvlBtnClick = async () => {
      try {
        await dispatch(submitOther());
      } catch (anyError: any) {
        const error = anyError as SerializedError;
        console.error('AvailabilitiesRow: submission failed:', error);
        showToast({
          msg: `Error updating ${selMode.otherUser}'s availabilities`,
          msgType: 'failure',
        });
        dispatch(goBackToEditingOther());
        return;
      }
      showToast({
        msg: `${selMode.otherUser}'s availabilities successfully updated`,
        msgType: 'success',
      });
      dispatch(cancelSelection());
    }
  } else if (selMode.type === 'selectedOther') {
    avlBtnText = `Edit ${selMode.otherUser}'s availability`;
    onAvlBtnClick = () => dispatch(editOther());
  } else if (selMode.type === 'submittingOther') {
    // TODO: show spinner
    avlBtnText = 'Save';
    avlBtnDisabled = true;
  } else if (selMode.type === 'submittingSelf') {
    // TODO: show spinner
    avlBtnText = 'Continue';
  } else {
    // Make sure that we caught all the cases
    assertIsNever(selMode.type);
  }

  const closeModal = useCallback(() => {
    setShouldShowModal(false);
  }, []);
  
  return (
    <React.Fragment>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4em',
        marginBottom: '2em',
      }}>
        <div style={{fontSize: '1.3em'}}>Availabilities</div>
        <div>
          {selMode.type !== 'none' && (
            <button
              className="meeting-heading-button meeting-avl-button"
              onClick={onCancelBtnClick}
            >
              Cancel
            </button>
          )}
          <button
            className="meeting-heading-button meeting-avl-button"
            disabled={avlBtnDisabled}
            onClick={onAvlBtnClick}
          >
            {avlBtnText}
          </button>
        </div>
      </div>
      {
        shouldShowModal && (
          <SaveTimesModal closeModal={closeModal} />
        )
      }
      {toast}
    </React.Fragment>
  );
}
export default React.memo(AvailabilitiesRow);
