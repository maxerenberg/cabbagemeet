import React, { useCallback } from 'react';
import { unwrapResult } from '@reduxjs/toolkit';
import type { SelModeType } from './types';
import { getUserFromSelMode } from './types';
import type { DateTimes} from '../../common/types';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { resetSubmitAvailabilitiesStatus, submitAvailabilities } from '../daypicker/meetingTimesSlice';
import { SaveTimesModal } from './SaveTimesModal';
import { useToast } from '../toast/Toast';

const AvailabilitiesRow = React.memo(function AvailabilitiesRow({
  selMode, setSelMode, selectedDateTimes, setSelectedDateTimes,
}: {
  selMode: SelModeType,
  setSelMode: (selMode: SelModeType) => void,
  selectedDateTimes: DateTimes,
  setSelectedDateTimes: (dateTimes: DateTimes) => void,
}) {
  const dispatch = useAppDispatch();
  const submitAvailabilitiesStatus = useAppSelector(
    state => state.meetingTimes.submitAvailabilitiesStatus);
  const { toast, showToast } = useToast();
  const selectedUser = getUserFromSelMode(selMode);
  let avlBtnText = '';
  let onAvlBtnClick: React.MouseEventHandler | undefined;
  const onCancelBtnClick = useCallback(() => {
    setSelMode('none');
    setSelectedDateTimes({});
  }, [setSelMode, setSelectedDateTimes]);
  
  if (selMode === 'none') {
    avlBtnText = 'Add availability';
    onAvlBtnClick = () => setSelMode('editingSelf');
  } else if (selMode === 'editingSelf') {
    avlBtnText = 'Save';
    onAvlBtnClick = () => setSelMode('submittingSelf');
  } else if (selMode.startsWith('editingOther')) {
    avlBtnText = 'Save';
    onAvlBtnClick = async () => {
      try {
        const resultAction = await dispatch(submitAvailabilities({
          user: selectedUser,
          dateTimes: selectedDateTimes,
        }));
        unwrapResult(resultAction);
        showToast({
          msg: `${selectedUser}'s availabilities successfully updated`,
          msgType: 'success',
        });
        dispatch(resetSubmitAvailabilitiesStatus());
        onCancelBtnClick();
      } catch (err) {
        console.error(err);
        showToast({
          msg: `Error updating ${selectedUser}'s availabilities`,
          msgType: 'failure',
        });
      }
    };
  } else if (selMode.startsWith('selectedOther')) {
    avlBtnText = `Edit ${selectedUser}'s availability`;
    onAvlBtnClick = () => setSelMode(`editingOther:${selectedUser}` as SelModeType);
  } else if (selMode === 'submittingSelf') {
    avlBtnText = 'Save';
  }
  
  const onModalClose = useCallback(() => {
    setSelMode('editingSelf');
  }, [setSelMode]);
  const postModalSubmit = useCallback(() => {
    onCancelBtnClick();
    showToast({
      msg: 'Availabilities successfully submitted',
      msgType: 'success',
    });
  }, [onCancelBtnClick, showToast]);
  
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
          {selMode !== 'none' && (
            <button
              className="meeting-heading-button meeting-avl-button"
              onClick={onCancelBtnClick}
            >
              Cancel
            </button>
          )}
          <button
            className="meeting-heading-button meeting-avl-button"
            disabled={submitAvailabilitiesStatus === 'loading'}
            onClick={onAvlBtnClick}
          >
            {avlBtnText}
          </button>
        </div>
      </div>
      {
        selMode === 'submittingSelf' && (
          <SaveTimesModal
            onClose={onModalClose}
            dateTimes={selectedDateTimes}
            postSubmit={postModalSubmit}
          />
        )
      }
      {toast}
    </React.Fragment>
  );
});
export default AvailabilitiesRow;
