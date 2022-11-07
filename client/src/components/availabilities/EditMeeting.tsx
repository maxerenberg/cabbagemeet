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
import { editMeeting, resetEditMeetingStatus } from "slices/meetingTimes";
import { useToast } from "components/Toast";
import DeleteMeetingModal from "./DeleteMeetingModal";
import ButtonWithSpinner from "components/ButtonWithSpinner";

// TODO: reduce code duplication with MeetingForm

export default function EditMeeting({
  setIsEditing,
}: {
  setIsEditing: (val: boolean) => void,
}) {
  const meeting = useAppSelector(state => state.meetingTimes);
  const [meetingName, setMeetingName] = useState(meeting.name!);
  const [meetingAbout, setMeetingAbout] = useState(meeting.about!);
  const [startTime, setStartTime] = useState(Math.floor(meeting.startTime!));
  const [endTime, setEndTime] = useState(Math.ceil(meeting.endTime!));
  const selectedDates = useAppSelector(selectSelectedDates);
  const editMeetingStatus = useAppSelector(state => state.meetingTimes.editMeetingStatus);
  const editMeetingError = useAppSelector(state => state.meetingTimes.error);
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
    dispatch(setSelectedDates(arrayToObject(meeting.dates)));
  }, [dispatch, meeting.dates]);

  useEffect(() => {
    if (editMeetingStatus === 'succeeded') {
      showToast({
        msg: 'Meeting successfully edited',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetEditMeetingStatus());
      setIsEditing(false);
    } else if (editMeetingStatus === 'failed') {
      showToast({
        msg: `Failed to edit meeting: ${editMeetingError || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(resetEditMeetingStatus());
    }
  }, [editMeetingStatus, showToast, setIsEditing, dispatch, editMeetingError]);

  const onSave: React.MouseEventHandler<HTMLButtonElement> = (ev) => {
    ev.preventDefault();
    if (meetingName === '') {
      // TODO: use Form validation
      return;
    }
    dispatch(editMeeting({
      id: meeting.id!,
      name: meetingName,
      about: meetingAbout,
      dates: Object.keys(selectedDates),
      startTime,
      endTime,
    }));
  };

  const isLoading = editMeetingStatus === 'loading';
  return (
    <Form className="edit-meeting">
      <MeetingNamePrompt {...{meetingName, setMeetingName, setIsEditing, onSave}} />
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
}: {
  meetingName: string,
  setMeetingName: (name: string) => void,
  setIsEditing: (val: boolean) => void,
  onSave: React.MouseEventHandler<HTMLButtonElement>,
}) {
  const isSaveLoading = useAppSelector(state => state.meetingTimes.editMeetingStatus === 'loading');
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
          disabled={isSaveLoading}
        >
          Delete
        </button>
        <button
          className="btn btn-outline-primary px-4 d-none d-md-block ms-md-4"
          tabIndex={-1}
          type="button"
          onClick={onCancelClick}
          disabled={isSaveLoading}
        >
          Cancel
        </button>
        <ButtonWithSpinner
          className="btn btn-primary ms-md-4 d-none d-md-block"
          tabIndex={-1}
          type="submit"
          onClick={onSave}
          disabled={meetingName === '' || isSaveLoading}
          isLoading={isSaveLoading}
        >
          Save
        </ButtonWithSpinner>
        <BottomOverlay>
          <button
            className="btn btn-outline-light px-4"
            tabIndex={-1}
            type="button"
            onClick={onCancelClick}
            disabled={isSaveLoading}
          >
            Cancel
          </button>
          <ButtonWithSpinner
            className="btn btn-light ms-auto create-meeting-button"
            tabIndex={-1}
            type="submit"
            onClick={onSave}
            disabled={meetingName === '' || isSaveLoading}
            isLoading={isSaveLoading}
          >
            Save
          </ButtonWithSpinner>
        </BottomOverlay>
      </Form.Group>
    </>
  );
}
