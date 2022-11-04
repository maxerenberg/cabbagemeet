import React, { useState, useCallback, useEffect, useMemo } from 'react';
import BottomOverlay from 'components/BottomOverlay';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import NonFocusButton from 'components/NonFocusButton';
import {
  selectSelMode,
  resetSelection,
  editSelf,
  goBackToEditingSelf,
  goBackToEditingOther,
  editSelectedUser,
  submitOther,
  createSchedule,
  goBackToEditingSchedule,
  submitSelfWhenLoggedIn,
  submitSchedule,
  submitUnschedule,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SaveTimesModal from './SaveTimesModal';
import { useToast } from 'components/Toast';
import { assertIsNever } from 'utils/misc';
import { selectMeetingIsScheduled, selectSelfIsInAvailabilities } from 'slices/meetingTimes';
import { selectUserID } from 'slices/authentication';
import { addMinutesToDateTimeString, daysOfWeek, months, to12HourClock } from 'utils/dates';

function AvailabilitiesRow({
  moreDaysToRight,
  pageDispatch,
}: {
  moreDaysToRight: boolean,
  pageDispatch: React.Dispatch<'inc' | 'dec'>,
}) {
  const selMode = useAppSelector(selectSelMode);
  const selfIsInAvailabilities = useAppSelector(selectSelfIsInAvailabilities);
  const isScheduled = useAppSelector(selectMeetingIsScheduled);
  const scheduledDateTimes = useAppSelector(state => state.meetingTimes.scheduledDateTimes);
  const scheduledDateTimeTitle = useMemo(() => {
    if (scheduledDateTimes === undefined) return null;
    const scheduledDateTimesFlat = Object.keys(scheduledDateTimes).sort();
    const startDateTime = scheduledDateTimesFlat[0];
    let endDateTime = scheduledDateTimesFlat[scheduledDateTimesFlat.length - 1];
    // Each key of scheduledDateTimes represents the start of a 30-minute interval,
    // so if we want a fully spanning interval, we need to add 30 min. to endDateTime
    endDateTime = addMinutesToDateTimeString(endDateTime, 30);
    return createTitleWithSchedule(startDateTime, endDateTime);
  }, [scheduledDateTimes]);
  const peopleInfos = useAppSelector(state => state.meetingTimes.people);
  const selfUserID = useAppSelector(selectUserID);
  const isLoggedIn = selfUserID !== null;
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
  let selectedUserName: string | undefined;

  // TODO: write a selector for this
  if (selMode.type === 'selectedUser') {
    selectedUserName = peopleInfos[selMode.selectedUserID].name;
  } else if (
    selMode.type === 'editingOther'
    || selMode.type === 'submittingOther'
    || selMode.type === 'submittedOther'
    || selMode.type === 'rejectedOther'
  ) {
    selectedUserName = peopleInfos[selMode.otherUserID].name;
  }
  if (scheduledDateTimeTitle !== null) {
    title = scheduledDateTimeTitle;
  }

  useEffect(() => {
    if (selMode.type === 'submittedSelf') {
      showToast({
        msg: 'Successfully updated availabilities',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (selMode.type === 'rejectedSelf') {
      // The modal will show its own error message, so we don't want to show a
      // toast as well
      if (!shouldShowModal) {
        showToast({
          msg: `Failed to update availabilities: ${selMode.error.message ?? 'unknown'}`,
          msgType: 'failure',
        });
        dispatch(goBackToEditingSelf());
      }
    } else if (selMode.type === 'submittedOther') {
      showToast({
        msg: `${selectedUserName}'s availabilities successfully updated`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (selMode.type === 'rejectedOther') {
      const mainMsg = `Error updating ${selectedUserName}'s availabilities`;
      showToast({
        msg: `${mainMsg}: ${selMode.error.message ?? 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(goBackToEditingOther());
    } else if (selMode.type === 'submittedSchedule') {
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
  }, [selMode, selectedUserName, selfUserID, shouldShowModal, showToast, dispatch]);

  if (selMode.type === 'none') {
    if (selfIsInAvailabilities) {
      rightBtnText = 'Edit availability';
    } else {
      rightBtnText = 'Add availability';
    }
    onRightBtnClick = () => dispatch(editSelf());
  } else if (selMode.type === 'editingSelf') {
    if (selfIsInAvailabilities) {
      title = 'Edit your availability';
    } else {
      title = 'Add your availability';
    }
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      if (isLoggedIn) {
        onRightBtnClick = () => dispatch(submitSelfWhenLoggedIn());
      } else {
        onRightBtnClick = () => setShouldShowModal(true);
      }
    }
  } else if (selMode.type === 'editingOther') {
    title = `Edit ${selMode.otherUserID}'s availability`;
    rightBtnText = 'Next';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = () =>  dispatch(submitOther());
    }
  } else if (selMode.type === 'editingSchedule') {
    title = 'Schedule your meeting';
    rightBtnText = 'Save';
    onRightBtnClick = () => dispatch(submitSchedule());;
  } else if (selMode.type === 'selectedUser') {
    if (selfUserID === selMode.selectedUserID) {
      title = 'Your availability';
      rightBtnText = 'Edit availability';
    } else {
      title = `${selectedUserName}'s availability`;
      rightBtnText = `Edit ${selectedUserName}'s availability`;
    }
    onRightBtnClick = () => dispatch(editSelectedUser());
  } else if (selMode.type === 'submittingOther' || selMode.type === 'submittedOther' || selMode.type === 'rejectedOther') {
    title = `Edit ${selMode.otherUserID}'s availability`;
    rightBtnText = 'Next';
    rightBtnDisabled = true;
  } else if (selMode.type === 'submittingSelf' || selMode.type === 'submittedSelf' || selMode.type === 'rejectedSelf') {
    if (selfIsInAvailabilities) {
      title = 'Edit your availability';
    } else {
      title = 'Add your availability';
    }
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

  if (selMode.type === 'none' || selMode.type === 'submittingUnschedule' || selMode.type === 'submittedUnschedule' || selMode.type === 'rejectedUnschedule') {
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
        <div className="d-none d-md-flex">
          {leftBtnText && (
            <NonFocusButton
              className="btn btn-outline-primary px-3 meeting-avl-button"
              onClick={onLeftBtnClick}
              disabled={leftBtnDisabled}
            >
              {leftBtnText} {leftBtnSpinner}
            </NonFocusButton>
          )}
          <NonFocusButton
            className="btn btn-primary ms-4 px-3 meeting-avl-button"
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
      {shouldShowModal && <SaveTimesModal onClose={closeModal} />}
    </>
  );
}
export default React.memo(AvailabilitiesRow);

/**
 * Generates a title of the form e.g. "Sat, Sep 24 from 9:00AM - 10:00AM"
 * @param startDateTime YYYY-MM-DDTHH:mm:ssZ
 * @param endDateTime YYYY-MM-DDTHH:mm:ssZ
 */
function createTitleWithSchedule(startDateTime: string, endDateTime: string): string {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  const dayOfWeek = daysOfWeek[startDate.getDay()].substring(0, 3);
  const month = months[startDate.getMonth()].substring(0, 3);
  const day = startDate.getDate();
  const startTime = to12HourClock(startDate.getHours()) + ':' + String(startDate.getMinutes()).padStart(2, '0') + (startDate.getHours() < 12 ? 'AM' : 'PM');
  const endTime = to12HourClock(endDate.getHours()) + ':' + String(endDate.getMinutes()).padStart(2, '0') + (endDate.getHours() < 12 ? 'AM' : 'PM');
  return `${dayOfWeek}, ${month} ${day} from ${startTime} - ${endTime}`;
}
