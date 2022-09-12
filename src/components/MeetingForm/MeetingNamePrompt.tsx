import React, { useEffect, useRef } from 'react';
import Form from 'react-bootstrap/Form';
import BottomOverlay from 'components/BottomOverlay';

export default function MeetingNamePrompt({
  meetingName,
  setMeetingName,
  onSubmit,
  isLoading,
}: {
  meetingName: string,
  setMeetingName: (name: string) => void,
  onSubmit: () => void,
  isLoading: boolean,
}) {
  const inputElem = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputElem.current!.focus();
  }, []);
  const onMeetingNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeetingName(e.target.value);
  };
  return (
    <Form.Group className="d-flex align-items-center">
      <Form.Control
        placeholder="Name your meeting"
        className="create-meeting-question form-text-input"
        style={{flexGrow: 1}}
        ref={inputElem}
        value={meetingName}
        onChange={onMeetingNameChange}
      />
      <button
        className="btn btn-primary px-4 d-none d-md-block ms-md-4"
        tabIndex={-1}
        type="button"
        onClick={onSubmit}
        disabled={meetingName === '' || isLoading}
      >
        Create
      </button>
      <BottomOverlay>
        <button
          className="btn btn-light px-4 ms-auto"
          tabIndex={-1}
          type="button"
          onClick={onSubmit}
          disabled={meetingName === '' || isLoading}
        >
          Create
        </button>
      </BottomOverlay>
    </Form.Group>
  );
}
