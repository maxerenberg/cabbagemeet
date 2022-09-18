import React, { useState, useCallback } from 'react';
import { SerializedError } from '@reduxjs/toolkit';
import BottomOverlay from 'components/BottomOverlay';
import NonFocusButton from 'components/NonFocusButton';
import {
  selectSelModeAndDateTimes,
  resetSelection,
  editSelf,
  goBackToEditingOther,
  editOther,
  submitOther,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SaveTimesModal from './SaveTimesModal';
import { useToast } from 'components/Toast';
import { assertIsNever } from 'utils/misc';

function AvailabilitiesRow({
  moreDaysToRight,
  pageDispatch,
}: {
  moreDaysToRight: boolean,
  pageDispatch: React.Dispatch<'inc' | 'dec'>,
}) {
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [shouldShowModal, setShouldShowModal] = useState(false);
  let rightBtnText: string | undefined;
  let onRightBtnClick: React.MouseEventHandler<HTMLButtonElement> = () => {};
  let avlBtnDisabled = false;
  const onCancelBtnClick = () => dispatch(resetSelection());

  if (selMode.type === 'none') {
    rightBtnText = 'Add availability';
    onRightBtnClick = () => dispatch(editSelf());
  } else if (selMode.type === 'editingSelf') {
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = () => setShouldShowModal(true);
    }
  } else if (selMode.type === 'editingOther') {
    rightBtnText = 'Next';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = async () => {
        try {
          await dispatch(submitOther());
        } catch (anyError: any) {
          const error = anyError as SerializedError;
          console.error('AvailabilitiesRow: submission failed:', error);
          showToast({
            msg: `Error updating ${selMode.otherUser}'s availabilities`,
            msgType: 'failure',
            autoClose: true,
          });
          dispatch(goBackToEditingOther());
          return;
        }
        showToast({
          msg: `${selMode.otherUser}'s availabilities successfully updated`,
          msgType: 'success',
          autoClose: true,
        });
        dispatch(resetSelection());
      };
    }
  } else if (selMode.type === 'selectedOther') {
    rightBtnText = `Edit ${selMode.otherUser}'s availability`;
    onRightBtnClick = () => dispatch(editOther());
  } else if (selMode.type === 'submittingOther') {
    // TODO: show spinner
    rightBtnText = 'Next';
    avlBtnDisabled = true;
  } else if (selMode.type === 'submittingSelf') {
    // TODO: show spinner
    rightBtnText = 'Continue';
  } else {
    // Make sure that we caught all the cases
    assertIsNever(selMode);
  }

  const closeModal = useCallback(() => {
    setShouldShowModal(false);
  }, []);

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4em',
        marginBottom: '2em',
      }}>
        <div style={{fontSize: '1.3em'}}>Availabilities</div>
        <div className="d-none d-md-block">
          {selMode.type !== 'none' && (
            <button
              className="btn btn-outline-primary px-0 meeting-avl-button"
              onClick={onCancelBtnClick}
            >
              Cancel
            </button>
          )}
          <NonFocusButton
            className="btn btn-primary ms-4 px-0 meeting-avl-button"
            disabled={avlBtnDisabled}
            onClick={onRightBtnClick}
          >
            {rightBtnText}
          </NonFocusButton>
        </div>
      </div>
      <BottomOverlay>
        {selMode.type !== 'none' && (
          <button
            className="btn btn-outline-light px-4 meeting-avl-button"
            onClick={onCancelBtnClick}
          >
            Cancel
          </button>
        )}
        <NonFocusButton
          className="btn btn-light ms-auto px-4 meeting-avl-button"
          disabled={avlBtnDisabled}
          onClick={onRightBtnClick}
        >
          {rightBtnText}
        </NonFocusButton>
      </BottomOverlay>
      {shouldShowModal && <SaveTimesModal closeModal={closeModal} />}
    </>
  );
}
export default React.memo(AvailabilitiesRow);
