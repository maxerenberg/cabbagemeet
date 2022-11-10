import React from 'react';
import Form from 'react-bootstrap/Form';
import BottomOverlay from 'components/BottomOverlay';
import ButtonWithSpinner from 'components/ButtonWithSpinner';

export default function MeetingNamePrompt({
  meetingName,
  setMeetingName,
  isLoading,
}: {
  meetingName: string,
  setMeetingName: (name: string) => void,
  isLoading: boolean,
}) {
  const onMeetingNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeetingName(e.target.value);
  };
  return (
    <Form.Group className="d-flex align-items-center">
      <Form.Control
        placeholder="Name your meeting"
        className="create-meeting-question form-text-input flex-grow-1"
        autoFocus
        value={meetingName}
        onChange={onMeetingNameChange}
      />
      <ButtonWithSpinner
        className="btn btn-primary d-none d-md-block ms-md-4 create-meeting-button"
        tabIndex={-1}
        type="submit"
        disabled={meetingName === '' || isLoading}
        isLoading={isLoading}
      >
        Create
      </ButtonWithSpinner>
      <BottomOverlay>
        <ButtonWithSpinner
          className="btn btn-light ms-auto create-meeting-button"
          tabIndex={-1}
          type="submit"
          disabled={meetingName === '' || isLoading}
          isLoading={isLoading}
        >
          Create
        </ButtonWithSpinner>
      </BottomOverlay>
    </Form.Group>
  );
}
