import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  editSelfAsOther,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SaveTimesModal from './SaveTimesModal';
import { useToast } from 'components/Toast';
import { assertIsNever } from 'utils/misc';
import { selectMeetingIsScheduled } from 'slices/meetingTimes';
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
  let otherUserName = 'unknown';

  // TODO: write a selector for this
  if (
    selMode.type === 'selectedOther'
    || selMode.type === 'editingOther'
    || selMode.type === 'submittingOther'
    || selMode.type === 'submittedOther'
    || selMode.type === 'rejectedOther'
  ) {
    otherUserName = peopleInfos[selMode.otherUserID].name;
  }
  if (scheduledDateTimeTitle !== null) {
    title = scheduledDateTimeTitle;
  }
  const selfIsInAvailabilities = selfUserID !== null && peopleInfos.hasOwnProperty(selfUserID);

  useEffect(() => {
    if (selMode.type === 'submittedOther') {
      const msg = selfUserID === selMode.otherUserID
        ? 'Availabilities successfully updated'
        : `${otherUserName}'s availabilities successfully updated`;
      showToast({
        msg,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (selMode.type === 'rejectedOther') {
      const mainMsg = selfUserID === selMode.otherUserID
       ? 'Error updating availabilities'
       : `Error updating ${otherUserName}'s availabilities`;
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
  }, [selMode, selfUserID, otherUserName, showToast, dispatch]);

  if (selMode.type === 'none') {
    if (selfIsInAvailabilities) {
      rightBtnText = 'Edit availability';
      onRightBtnClick = () => dispatch(editSelfAsOther());
    } else {
      rightBtnText = 'Add availability';
      onRightBtnClick = () => dispatch(editSelf());
    }
  } else if (selMode.type === 'editingSelf') {
    title = 'Add your availability';
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = () => setShouldShowModal(true);
    }
  } else if (selMode.type === 'editingOther') {
    if (selfUserID === selMode.otherUserID) {
      title = 'Edit your availability';
    } else {
      title = `Edit ${otherUserName}'s availability`;
    }
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
  } else if (selMode.type === 'selectedOther') {
    title = `${otherUserName}'s availability`;
    rightBtnText = `Edit ${otherUserName}'s availability`;
    onRightBtnClick = () => dispatch(editOther());
  } else if (selMode.type === 'submittingOther' || selMode.type === 'submittedOther' || selMode.type === 'rejectedOther') {
    if (selfUserID === selMode.otherUserID) {
      title = 'Edit your availability';
    } else {
      title = `Edit ${otherUserName}'s availability`;
    }
    rightBtnText = 'Next';
    rightBtnDisabled = true;
  } else if (selMode.type === 'submittingSelf' || selMode.type === 'submittedSelf' || selMode.type === 'rejectedSelf') {
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
