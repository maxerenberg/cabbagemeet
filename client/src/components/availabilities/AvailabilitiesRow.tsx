import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import SubmitAsGuestModal from './SubmitAsGuestModal';
import { useToast } from 'components/Toast';
import { assert, assertIsNever } from 'utils/misc.utils';
import { addMinutesToDateTimeString, daysOfWeek, months, to12HourClock } from 'utils/dates.utils';
import ButtonWithSpinner from 'components/ButtonWithSpinner';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { selectTokenIsPresent } from 'slices/authentication';
import { usePutSelfRespondentMutation, useDeleteRespondentMutation, useScheduleMeetingMutation, useUnscheduleMeetingMutation, useUpdateAvailabilitiesMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';
import { selectCurrentMeetingID } from 'slices/currentMeeting';
import InfoModal from 'components/InfoModal';

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
    {isSuccess: submitSelf_isSuccess, isLoading: submitSelf_isLoading, error: submitSelf_error}
  ] = usePutSelfRespondentMutation();
  // updateRespondent is used for updating some existing respondent, who may be the current
  // user who is logged in
  const [
    updateRespondent,
    {isSuccess: updateRespondent_isSuccess, isLoading: updateRespondent_isLoading, error: updateRespondent_error}
  ] = useUpdateAvailabilitiesMutation();
  const [
    deleteRespondent,
    {isSuccess: deleteRespondent_isSuccess, isLoading: deleteRespondent_isLoading, error: deleteRespondent_error}
  ] = useDeleteRespondentMutation();
  const [
    schedule,
    {isSuccess: schedule_isSuccess, isLoading: schedule_isLoading, error: schedule_error}
  ] = useScheduleMeetingMutation();
  const [
    unschedule,
    {isSuccess: unschedule_isSuccess, isLoading: unschedule_isLoading, error: unschedule_error}
  ] = useUnscheduleMeetingMutation();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [atLeastOneRequestSentSinceLastCancel, setAtLeastOneRequestSentSinceLastCancel] = useState(false);
  const errorMessageElemRef = useRef<HTMLParagraphElement>(null);
  let title = 'Availabilities';
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  // A ref is necessary to avoid running the useEffect hooks (which show the
  // toast messages) twice
  const selectedUserNameRef = useRef<string | null>(null);

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
    }
  }, [submitSelf_isSuccess, showToast, dispatch]);

  // Make sure this runs AFTER the hook which shows the toast, above
  useEffect(() => {
    selfRespondentIDRef.current = selfRespondentID;
  }, [selfRespondentID]);

  useEffect(() => {
    if (updateRespondent_isSuccess) {
      showToast({
        msg: `${selectedUserNameRef.current}'s availabilities successfully updated`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    }
  }, [updateRespondent_isSuccess, showToast, dispatch])

  useEffect(() => {
    if (deleteRespondent_isSuccess) {
      showToast({
        msg: `Successfully deleted respondent`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    }
  }, [deleteRespondent_isSuccess, showToast, dispatch]);

  useEffect(() => {
    if (schedule_isSuccess) {
      showToast({
        msg: 'Successfully scheduled meeting',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    }
  }, [schedule_isSuccess, showToast, dispatch]);

  useEffect(() => {
    if (unschedule_isSuccess) {
      showToast({
        msg: `Schedule successfully removed`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    }
  }, [unschedule_isSuccess, showToast, dispatch]);

  useEffect(() => {
    if (selMode.type === 'selectedUser') {
      selectedUserNameRef.current = respondents[selMode.selectedRespondentID].name;
    } else if (selMode.type === 'editingRespondent') {
      selectedUserNameRef.current = respondents[selMode.respondentID].name;
    } else {
      selectedUserNameRef.current = null;
    }
    // FIXME: this feels wrong
    setSelectedUserName(selectedUserNameRef.current);
  }, [selMode, respondents]);

  const error = submitSelf_error || updateRespondent_error || deleteRespondent_error || schedule_error || unschedule_error;
  // Don't show the error if the user pressed Cancel
  const showError = error !== undefined && atLeastOneRequestSentSinceLastCancel;

  useEffect(() => {
    if (showError) {
      errorMessageElemRef.current!.scrollIntoView(false);
    }
  }, [showError]);

  const btnDisabled = submitSelf_isLoading || updateRespondent_isLoading || deleteRespondent_isLoading || schedule_isLoading || unschedule_isLoading;
  let rightBtnText: string | undefined;
  let onRightBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  let rightBtn_isLoading = false;
  if (selMode.type === 'none') {
    if (selfRespondentID !== undefined) {
      rightBtnText = 'Edit availability';
    } else {
      rightBtnText = 'Add availability';
    }
    onRightBtnClick = () => editSelf();
  } else if (selMode.type === 'addingRespondent') {
    title = 'Add your availability';
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      if (isLoggedIn) {
        onRightBtnClick = () => {
          submitSelf({
            id: meetingID,
            putRespondentDto: {
              availabilities: Object.keys(selectedTimes),
            },
          });
          setAtLeastOneRequestSentSinceLastCancel(true);
        };
        rightBtn_isLoading = submitSelf_isLoading;
      } else {
        onRightBtnClick = () => setShowGuestModal(true);
      }
    }
  } else if (selMode.type === 'editingRespondent') {
    if (selfRespondentID === selMode.respondentID) {
      title = 'Edit your availability';
    } else {
      title = `Edit ${selectedUserName}'s availability`;
    }
    rightBtnText = 'Next';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = () => {
        updateRespondent({
          id: meetingID,
          respondentId: selMode.respondentID,
          putRespondentDto: {
            availabilities: Object.keys(selectedTimes),
          },
        });
        setAtLeastOneRequestSentSinceLastCancel(true);
      };
      rightBtn_isLoading = updateRespondent_isLoading;
    }
  } else if (selMode.type === 'editingSchedule') {
    title = 'Schedule your meeting';
    rightBtnText = 'Save';
    onRightBtnClick = () => {
      const selectedTimesFlat = Object.keys(selectedTimes).sort();
      if (selectedTimesFlat.length === 0) {
        setShowInfoModal(true);
        return;
      }
      schedule({
        id: meetingID,
        scheduleMeetingDto: {
          startDateTime: selectedTimesFlat[0],
          endDateTime: addMinutesToDateTimeString(selectedTimesFlat[selectedTimesFlat.length - 1], 30),
        }
      });
      setAtLeastOneRequestSentSinceLastCancel(true);
    };
    rightBtn_isLoading = schedule_isLoading;
  } else if (selMode.type === 'selectedUser') {
    if (selfRespondentID === selMode.selectedRespondentID) {
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

  let leftBtnText: string | undefined;
  let onLeftBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  let leftBtn_isLoading = false;
  if (selMode.type === 'none') {
    if (isScheduled) {
      leftBtnText = 'Unschedule';
      onLeftBtnClick = () => {
        unschedule(meetingID);
        setAtLeastOneRequestSentSinceLastCancel(true);
      };
      leftBtn_isLoading = unschedule_isLoading;
    } else {
      leftBtnText = 'Schedule';
      onLeftBtnClick = () => dispatch(createSchedule());
    }
  } else {
    leftBtnText = 'Cancel';
    onLeftBtnClick = () => {
      dispatch(resetSelection());
      setAtLeastOneRequestSentSinceLastCancel(false);
    };
  }

  let onDeleteBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  // TODO: show confirmation modal
  if (selMode.type === 'editingRespondent') {
    onDeleteBtnClick = () => {
      deleteRespondent({
        id: meetingID,
        respondentId: selMode.respondentID,
      });
      setAtLeastOneRequestSentSinceLastCancel(true);
    };
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between">
        <div style={{fontSize: '1.3em'}}>{title}</div>
        <div className="d-none d-md-flex">
          {onDeleteBtnClick && (
            <ButtonWithSpinner
              as="NonFocusButton"
              className="btn btn-outline-danger me-4 meeting-avl-button"
              onClick={onDeleteBtnClick}
              disabled={btnDisabled}
              isLoading={deleteRespondent_isLoading}
            >
              Delete
            </ButtonWithSpinner>
          )}
          {onLeftBtnClick && (
            <ButtonWithSpinner
              as="NonFocusButton"
              className="btn btn-outline-primary meeting-avl-button"
              onClick={onLeftBtnClick}
              disabled={btnDisabled}
              isLoading={leftBtn_isLoading}
            >
              {leftBtnText}
            </ButtonWithSpinner>
          )}
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-primary ms-4 meeting-avl-button"
            onClick={onRightBtnClick}
            disabled={btnDisabled}
            isLoading={rightBtn_isLoading}
          >
            {rightBtnText}
          </ButtonWithSpinner>
        </div>
      </div>
      <BottomOverlay>
        {onDeleteBtnClick && (
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-outline-light me-2 meeting-avl-button"
            onClick={onDeleteBtnClick}
            disabled={btnDisabled}
            isLoading={deleteRespondent_isLoading}
          >
            Delete
          </ButtonWithSpinner>
        )}
        {leftBtnText && (
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-outline-light meeting-avl-button"
            onClick={onLeftBtnClick}
            disabled={btnDisabled}
            isLoading={leftBtn_isLoading}
          >
            {leftBtnText}
          </ButtonWithSpinner>
        )}
        <ButtonWithSpinner
          as="NonFocusButton"
          className="btn btn-light ms-auto meeting-avl-button"
          onClick={onRightBtnClick}
          disabled={btnDisabled}
          isLoading={rightBtn_isLoading}
        >
          {rightBtnText}
        </ButtonWithSpinner>
      </BottomOverlay>
      {showError && (
        <p
          className="text-danger text-center mb-0 mt-3"
          ref={errorMessageElemRef}
        >
          An error occurred: {getReqErrorMessage(error)}
        </p>
      )}
      <SubmitAsGuestModal show={showGuestModal} setShow={setShowGuestModal} />
      <InfoModal show={showInfoModal} setShow={setShowInfoModal}>
        <p className="text-center my-3">At least one time needs to be selected.</p>
      </InfoModal>
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
