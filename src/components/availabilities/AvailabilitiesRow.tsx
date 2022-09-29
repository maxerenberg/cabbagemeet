import React, { useState, useCallback, useEffect } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import BottomOverlay from 'components/BottomOverlay';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import NonFocusButton from 'components/NonFocusButton';
import {
  selectSelMode,
  resetSelection,
  editSelf,
  goBackToEditingOther,
  editOther,
  submitOther,
  createSchedule,
  goBackToEditingSchedule,
  submitSchedule,
  submitUnschedule,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SaveTimesModal from './SaveTimesModal';
import { useToast } from 'components/Toast';
import { assertIsNever } from 'utils/misc';
import { selectMeetingIsScheduled } from 'slices/meetingTimes';

function AvailabilitiesRow({
  moreDaysToRight,
  pageDispatch,
}: {
  moreDaysToRight: boolean,
  pageDispatch: React.Dispatch<'inc' | 'dec'>,
}) {
  const selMode = useAppSelector(selectSelMode);
  const isScheduled = useAppSelector(selectMeetingIsScheduled);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const closeModal = useCallback(() => setShouldShowModal(false), []);
  let rightBtnText: string | undefined;
  let onRightBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  let rightBtnDisabled = false;
  let leftBtnText: string | undefined;
  let onLeftBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  let leftBtnDisabled = false;
  let title = 'Availabilities';

  useEffect(() => {
    if (selMode.type === 'submittedSchedule') {
      showToast({
        msg: `Schedule successfully submitted`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (selMode.type === 'rejectedSchedule') {
      showToast({
        msg: `Error submitting schedule: ${selMode.error.message ?? 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(goBackToEditingSchedule());
    } else if (selMode.type === 'submittedUnschedule') {
      showToast({
        msg: `Schedule successfully removed`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (selMode.type === 'rejectedUnschedule') {
      showToast({
        msg: `Error removing schedule: ${selMode.error.message ?? 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(resetSelection());
    }
  }, [selMode, showToast, dispatch]);

  if (selMode.type === 'none') {
    rightBtnText = 'Add availability';
    onRightBtnClick = () => dispatch(editSelf());
  } else if (selMode.type === 'editingSelf') {
    title = 'Add your availability';
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = () => setShouldShowModal(true);
    }
  } else if (selMode.type === 'editingOther') {
    title = `Edit ${selMode.otherUser}'s availability`;
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
  } else if (selMode.type === 'editingSchedule') {
    title = 'Schedule your meeting';
    rightBtnText = 'Save';
    onRightBtnClick = () => dispatch(submitSchedule());;
  } else if (selMode.type === 'selectedOther') {
    title = `${selMode.otherUser}'s availability`;
    rightBtnText = `Edit ${selMode.otherUser}'s availability`;
    onRightBtnClick = () => dispatch(editOther());
  } else if (selMode.type === 'submittingOther') {
    title = `Edit ${selMode.otherUser}'s availability`;
    rightBtnText = 'Next';
    rightBtnDisabled = true;
  } else if (selMode.type === 'submittingSelf') {
    title = 'Add your availability';
    rightBtnText = 'Continue';
    rightBtnDisabled = true;
  } else if (selMode.type === 'submittingSchedule' || selMode.type === 'submittedSchedule' || selMode.type === 'rejectedSchedule') {
    title = 'Schedule your meeting';
    rightBtnText = 'Save';
    rightBtnDisabled = true;
  } else if (selMode.type === 'submittingUnschedule' || selMode.type === 'submittedUnschedule' || selMode.type === 'rejectedUnschedule') {
    rightBtnText = 'Add availability';
    leftBtnDisabled = true;
  } else {
    // Make sure that we caught all the cases
    assertIsNever(selMode);
  }

  if (selMode.type === 'none') {
    if (isScheduled) {
      leftBtnText = 'Unschedule';
      onLeftBtnClick = () => dispatch(submitUnschedule());
    } else {
      leftBtnText = 'Schedule';
      onLeftBtnClick = () => dispatch(createSchedule());
    }
  } else {
    leftBtnText = 'Cancel';
    onLeftBtnClick = () => dispatch(resetSelection());
  }

  const leftBtnSpinner = leftBtnDisabled && <ButtonSpinnerRight />;
  const rightBtnSpinner = rightBtnDisabled && <ButtonSpinnerRight />;

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4em',
        marginBottom: '2em',
      }}>
        <div style={{fontSize: '1.3em'}}>{title}</div>
        <div className="d-none d-md-block">
          {leftBtnText && (
            <NonFocusButton
              className="btn btn-outline-primary px-0 meeting-avl-button"
              onClick={onLeftBtnClick}
              disabled={leftBtnDisabled}
            >
              {leftBtnText} {leftBtnSpinner}
            </NonFocusButton>
          )}
          <NonFocusButton
            className="btn btn-primary ms-4 px-0 meeting-avl-button"
            disabled={rightBtnDisabled}
            onClick={onRightBtnClick}
          >
            {rightBtnText} {rightBtnSpinner}
          </NonFocusButton>
        </div>
      </div>
      <BottomOverlay>
        {leftBtnText && (
          <NonFocusButton
            className="btn btn-outline-light px-4 meeting-avl-button"
            onClick={onLeftBtnClick}
            disabled={leftBtnDisabled}
          >
            {leftBtnText} {leftBtnSpinner}
          </NonFocusButton>
        )}
        <NonFocusButton
          className="btn btn-light ms-auto px-4 meeting-avl-button"
          disabled={rightBtnDisabled}
          onClick={onRightBtnClick}
        >
          {rightBtnText} {rightBtnSpinner}
        </NonFocusButton>
      </BottomOverlay>
      {shouldShowModal && <SaveTimesModal closeModal={closeModal} />}
    </>
  );
}
export default React.memo(AvailabilitiesRow);
