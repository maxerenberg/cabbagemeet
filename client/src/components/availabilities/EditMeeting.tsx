import React, { useCallback, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from "components/BottomOverlay";
import MeetingAboutPrompt from "components/MeetingForm/MeetingAboutPrompt";
import MeetingTimesPrompt from "components/MeetingForm/MeetingTimesPrompt";
import Calendar from "components/DayPicker/Calendar";
import 'components/DayPicker/DayPicker.css';
import 'components/MeetingForm/MeetingForm.css';
import { resetSelectedDates, selectSelectedDates, setSelectedDates } from "slices/selectedDates";
import { arrayToObject } from "utils/arrays.utils";
import { useToast } from "components/Toast";
import DeleteMeetingModal from "./DeleteMeetingModal";
import ButtonWithSpinner from "components/ButtonWithSpinner";
import { useEditMeetingMutation } from "slices/api";
import { getReqErrorMessage } from "utils/requests.utils";
import { ianaTzName } from "utils/dates.utils";
import { useGetCurrentMeetingWithSelector } from "utils/meetings.hooks";
import { assert } from "utils/misc.utils";

// TODO: reduce code duplication with MeetingForm

export default function EditMeeting({
  setIsEditing,
}: {
  setIsEditing: (val: boolean) => void,
}) {
  const {meeting} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({meeting})
  );
  assert(meeting !== undefined);
  const [meetingName, setMeetingName] = useState(meeting.name);
  const [meetingAbout, setMeetingAbout] = useState(meeting.about);
  const [startTime, setStartTime] = useState(Math.floor(meeting.minStartHour));
  const [endTime, setEndTime] = useState(Math.ceil(meeting.maxEndHour));
  const selectedDates = useAppSelector(selectSelectedDates);
  const [editMeeting, {isLoading, isSuccess, isError, error}] = useEditMeetingMutation();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  useEffect(() => {
    // Reset the selectedDates when unmounting
    return () => {
      dispatch(resetSelectedDates());
    };
  }, [dispatch]);

  // FIXME: This seems to run twice during the first render
  useEffect(() => {
    dispatch(setSelectedDates(arrayToObject(meeting.tentativeDates)));
  }, [dispatch, meeting.tentativeDates]);

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Meeting successfully edited',
        msgType: 'success',
        autoClose: true,
      });
      setIsEditing(false);
    } else if (isError) {
      showToast({
        msg: `Failed to edit meeting: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    }
  }, [isSuccess, isError, error, showToast, setIsEditing]);

  const onSave: React.MouseEventHandler<HTMLButtonElement> = (ev) => {
    ev.preventDefault();
    if (meetingName === '') {
      // TODO: use Form validation
      return;
    }
    editMeeting({
      id: meeting.meetingID,
      editMeetingDto: {
        name: meetingName,
        about: meetingAbout,
        tentativeDates: Object.keys(selectedDates),
        minStartHour: startTime,
        maxEndHour: endTime,
        timezone: ianaTzName,
      }
    });
  };

  return (
    <Form className="edit-meeting">
      <MeetingNamePrompt {...{meetingName, setMeetingName, setIsEditing, onSave, isLoading}} />
      <MeetingAboutPrompt {...{meetingAbout, setMeetingAbout}} />
      <div className="create-meeting-form-group">
        <p className="fs-5">On which days would you like to meet?</p>
        <Calendar />
      </div>
      <div className="d-md-flex align-items-md-end">
        <MeetingTimesPrompt {...{startTime, setStartTime, endTime, setEndTime}} />
        <div className="ms-auto me-3 d-none d-md-block">
          <ButtonWithSpinner
            className="btn btn-primary"
            onClick={onSave}
            disabled={meetingName === '' || isLoading}
            isLoading={isLoading}
          >
            Save
          </ButtonWithSpinner>
        </div>
      </div>
    </Form>
  );
};

function MeetingNamePrompt({
  meetingName,
  setMeetingName,
  setIsEditing,
  onSave,
  isLoading,
}: {
  meetingName: string,
  setMeetingName: (name: string) => void,
  setIsEditing: (val: boolean) => void,
  onSave: React.MouseEventHandler<HTMLButtonElement>,
  isLoading: boolean,
}) {
  const onMeetingNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeetingName(e.target.value);
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const onDeleteModalClose = useCallback(() => setShowDeleteModal(false), []);
  const onDeleteClick = () => setShowDeleteModal(true);
  const onCancelClick = () => setIsEditing(false);
  return (
    <>
      {showDeleteModal && <DeleteMeetingModal onClose={onDeleteModalClose} />}
      <Form.Group className="d-flex align-items-center">
        <Form.Control
          placeholder="Name your meeting"
          className="create-meeting-question form-text-input flex-grow-1"
          autoFocus
          value={meetingName}
          onChange={onMeetingNameChange}
        />
        <button
          className="btn btn-outline-danger px-4 ms-4"
          tabIndex={-1}
          type="button"
          onClick={onDeleteClick}
          disabled={isLoading}
        >
          Delete
        </button>
        <button
          className="btn btn-outline-primary px-4 d-none d-md-block ms-md-4"
          tabIndex={-1}
          type="button"
          onClick={onCancelClick}
          disabled={isLoading}
        >
          Cancel
        </button>
        <ButtonWithSpinner
          className="btn btn-primary ms-md-4 d-none d-md-block"
          tabIndex={-1}
          type="submit"
          onClick={onSave}
          disabled={meetingName === '' || isLoading}
          isLoading={isLoading}
        >
          Save
        </ButtonWithSpinner>
        <BottomOverlay>
          <button
            className="btn btn-outline-light px-4"
            tabIndex={-1}
            type="button"
            onClick={onCancelClick}
            disabled={isLoading}
          >
            Cancel
          </button>
          <ButtonWithSpinner
            className="btn btn-light ms-auto create-meeting-button"
            tabIndex={-1}
            type="submit"
            onClick={onSave}
            disabled={meetingName === '' || isLoading}
            isLoading={isLoading}
          >
            Save
          </ButtonWithSpinner>
        </BottomOverlay>
      </Form.Group>
    </>
  );
}
