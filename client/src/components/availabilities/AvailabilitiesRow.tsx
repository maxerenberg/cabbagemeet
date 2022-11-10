import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import BottomOverlay from 'components/BottomOverlay';
import {
  selectSelMode,
  resetSelection,
  useEditSelf,
  useEditSelectedUser,
  createSchedule,
  selectSelectedTimes,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SaveTimesModal from './SaveTimesModal';
import { useToast } from 'components/Toast';
import { assert, assertIsNever } from 'utils/misc.utils';
import { addMinutesToDateTimeString, daysOfWeek, months, to12HourClock } from 'utils/dates.utils';
import ButtonWithSpinner from 'components/ButtonWithSpinner';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { selectTokenIsPresent } from 'slices/authentication';
import { useAddGuestRespondentMutation, useAddSelfRespondentMutation, useScheduleMeetingMutation, useUnscheduleMeetingMutation, useUpdateAvailabilitiesMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';
import { selectCurrentMeetingID } from 'slices/currentMeeting';

function AvailabilitiesRow({
  moreDaysToRight,
  pageDispatch,
}: {
  moreDaysToRight: boolean,
  pageDispatch: React.Dispatch<'inc' | 'dec'>,
}) {
  const selMode = useAppSelector(selectSelMode);
  const selectedTimes = useAppSelector(selectSelectedTimes);
  const meetingID = useAppSelector(selectCurrentMeetingID);
  const {respondents, selfRespondentID, scheduledDateTimes} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({
      respondents: meeting?.respondents,
      selfRespondentID: meeting?.selfRespondentID,
      scheduledDateTimes: meeting?.scheduledDateTimes,
    })
  );
  assert(meetingID !== undefined && respondents !== undefined);
  // The ref is necessary to avoid showing the toast twice when submitting availabilities
  // for the user who is currently logged in for the first time
  const selfRespondentIDRef = useRef(selfRespondentID);
  const isScheduled = scheduledDateTimes !== undefined;
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
  // optimistic - assume that if token is present, user info will be successfully fetched
  const isLoggedIn = useAppSelector(selectTokenIsPresent);
  const editSelf = useEditSelf(isLoggedIn);
  const editSelectedUser = useEditSelectedUser();
  // submitSelf is ONLY used for adding or updating one's availabilities when logged in
  const [
    submitSelf,
    {isSuccess: submitSelf_isSuccess, isLoading: submitSelf_isLoading, isError: submitSelf_isError, error: submitSelf_error}
  ] = useAddSelfRespondentMutation();
  // updateRespondent is used for updating some existing respondent, who may be the current
  // user who is logged in
  const [
    updateRespondent,
    {isSuccess: updateRespondent_isSuccess, isLoading: updateRespondent_isLoading, isError: updateRespondent_isError, error: updateRespondent_error}
  ] = useUpdateAvailabilitiesMutation();
  const [
    addGuest,
    {isSuccess: addGuest_isSuccess, isLoading: addGuest_isLoading, isError: addGuest_isError, error: addGuest_error}
  ] = useAddGuestRespondentMutation();
  const [
    schedule,
    {isSuccess: schedule_isSuccess, isLoading: schedule_isLoading, isError: schedule_isError, error: schedule_error}
  ] = useScheduleMeetingMutation();
  const [
    unschedule,
    {isSuccess: unschedule_isSuccess, isLoading: unschedule_isLoading, isError: unschedule_isError, error: unschedule_error}
  ] = useUnscheduleMeetingMutation();
  const addGuest_wrapper = useCallback((name: string, email?: string) => {
    addGuest({
      id: meetingID,
      addGuestRespondentDto: {
        availabilities: Object.keys(selectedTimes),
        name,
        email,
      },
    });
  }, [meetingID, selectedTimes, addGuest]);
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

  if (selMode.type === 'selectedUser') {
    selectedUserName = respondents[selMode.selectedUserID].name;
  } else if (selMode.type === 'editingOther') {
    selectedUserName = respondents[selMode.otherUserID].name;
  }
  if (scheduledDateTimeTitle !== null) {
    title = scheduledDateTimeTitle;
  }

  useEffect(() => {
    if (submitSelf_isSuccess) {
      const verb = selfRespondentIDRef.current === undefined ? 'added' : 'updated';
      showToast({
        msg: `Successfully ${verb} availabilities`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (submitSelf_isError) {
      showToast({
        msg: `Failed to update availabilities: ${getReqErrorMessage(submitSelf_error!)}`,
        msgType: 'failure',
      });
    }
  }, [submitSelf_isSuccess, submitSelf_isError, submitSelf_error, showToast, dispatch]);

  // Make sure this runs AFTER the hook which shows the toast, above
  useEffect(() => {
    selfRespondentIDRef.current = selfRespondentID;
  }, [selfRespondentID]);

  useEffect(() => {
    if (updateRespondent_isSuccess) {
      showToast({
        msg: `${selectedUserName}'s availabilities successfully updated`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (updateRespondent_isError) {
      showToast({
        msg: `Error updating ${selectedUserName}'s availabilities: ${getReqErrorMessage(updateRespondent_error!)}`,
        msgType: 'failure',
      });
    }
  }, [updateRespondent_isSuccess, updateRespondent_isError, updateRespondent_error, showToast, selectedUserName, dispatch])

  useEffect(() => {
    if (schedule_isSuccess) {
      showToast({
        msg: 'Successfully scheduled meeting',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (schedule_isError) {
      showToast({
        msg: `Error submitting schedule: ${getReqErrorMessage(schedule_error!)}`,
        msgType: 'failure',
      });
    }
  }, [schedule_isSuccess, schedule_isError, schedule_error, showToast, dispatch]);

  useEffect(() => {
    if (unschedule_isSuccess) {
      showToast({
        msg: `Schedule successfully removed`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    } else if (unschedule_isError) {
      showToast({
        msg: `Error removing schedule: ${getReqErrorMessage(unschedule_error!)}`,
        msgType: 'failure',
      });
    }
  }, [unschedule_isSuccess, unschedule_isError, unschedule_error, showToast, dispatch]);

  if (submitSelf_isLoading || updateRespondent_isLoading || schedule_isLoading || unschedule_isLoading) {
    leftBtnDisabled = rightBtnDisabled = true;
  }

  if (selMode.type === 'none') {
    if (selfRespondentID !== undefined) {
      rightBtnText = 'Edit availability';
    } else {
      rightBtnText = 'Add availability';
    }
    onRightBtnClick = () => editSelf();
  } else if (selMode.type === 'editingSelf') {
    if (selfRespondentID !== undefined) {
      title = 'Edit your availability';
    } else {
      title = 'Add your availability';
    }
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      if (isLoggedIn) {
        onRightBtnClick = () => submitSelf({
          id: meetingID,
          putRespondentDto: {
            availabilities: Object.keys(selectedTimes),
          },
        });
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
      onRightBtnClick = () => updateRespondent({
        id: meetingID,
        respondentId: selMode.otherUserID,
        putRespondentDto: {
          availabilities: Object.keys(selectedTimes),
        },
      });
    }
  } else if (selMode.type === 'editingSchedule') {
    title = 'Schedule your meeting';
    rightBtnText = 'Save';
    onRightBtnClick = () => {
      const selectedTimesFlat = Object.keys(selectedTimes).sort();
      if (selectedTimesFlat.length === 0) {
        showToast({
          msg: 'At least one time needs to be selected',
          msgType: 'failure',
          autoClose: true,
        });
        return;
      }
      schedule({
        id: meetingID,
        scheduleMeetingDto: {
          startDateTime: selectedTimesFlat[0],
          endDateTime: selectedTimesFlat[selectedTimesFlat.length - 1],
        }
      });
    };
  } else if (selMode.type === 'selectedUser') {
    if (selfRespondentID === selMode.selectedUserID) {
      title = 'Your availability';
      rightBtnText = 'Edit availability';
    } else {
      title = `${selectedUserName}'s availability`;
      rightBtnText = `Edit ${selectedUserName}'s availability`;
    }
    onRightBtnClick = () => editSelectedUser();
  } else {
    // Make sure that we caught all the cases
    assertIsNever(selMode);
  }

  if (selMode.type === 'none') {
    if (isScheduled) {
      leftBtnText = 'Unschedule';
      onLeftBtnClick = () => unschedule(meetingID);
    } else {
      leftBtnText = 'Schedule';
      onLeftBtnClick = () => dispatch(createSchedule());
    }
  } else {
    leftBtnText = 'Cancel';
    onLeftBtnClick = () => dispatch(resetSelection());
  }

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
          {leftBtnText && leftBtnText === 'Cancel' ? (
            <button
              type="button"
              className="btn btn-outline-primary meeting-avl-button"
              onClick={onLeftBtnClick}
              disabled={leftBtnDisabled}
            >
              {leftBtnText}
            </button>
          ) : (
            <ButtonWithSpinner
              as="NonFocusButton"
              className="btn btn-outline-primary meeting-avl-button"
              onClick={onLeftBtnClick}
              isLoading={leftBtnDisabled}
            >
              {leftBtnText}
            </ButtonWithSpinner>
          )}
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-primary ms-4 meeting-avl-button"
            isLoading={rightBtnDisabled}
            onClick={onRightBtnClick}
          >
            {rightBtnText}
          </ButtonWithSpinner>
        </div>
      </div>
      <BottomOverlay>
        {leftBtnText && (
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-outline-light meeting-avl-button"
            onClick={onLeftBtnClick}
            isLoading={leftBtnDisabled}
          >
            {leftBtnText}
          </ButtonWithSpinner>
        )}
        <ButtonWithSpinner
          as="NonFocusButton"
          className="btn btn-light ms-auto meeting-avl-button"
          isLoading={rightBtnDisabled}
          onClick={onRightBtnClick}
        >
          {rightBtnText}
        </ButtonWithSpinner>
      </BottomOverlay>
      {shouldShowModal && (
        <SaveTimesModal
          onClose={closeModal}
          submitAsGuest={addGuest_wrapper}
          isSuccess={addGuest_isSuccess}
          isLoading={addGuest_isLoading}
          isError={addGuest_isError}
          error={addGuest_error}
        />
      )}
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
