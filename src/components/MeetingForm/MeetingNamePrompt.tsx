import React, { useEffect, useRef } from 'react';
import Form from 'react-bootstrap/Form';
import BottomOverlay from 'components/BottomOverlay';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import { useAppSelector } from 'app/hooks';

export default function MeetingNamePrompt({
  meetingName,
  setMeetingName,
}: {
  meetingName: string,
  setMeetingName: (name: string) => void,
}) {
  const isLoading = useAppSelector(state => state.meetingTimes.createMeetingStatus === 'loading');
  const inputElem = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputElem.current!.focus();
  }, []);
  const onMeetingNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeetingName(e.target.value);
  };
  const spinner = isLoading && <ButtonSpinnerRight />;
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
        className="btn btn-primary px-4 d-none d-md-block ms-md-4 create-meeting-button"
        tabIndex={-1}
        type="submit"
        disabled={meetingName === '' || isLoading}
      >
        Create {spinner}
      </button>
      <BottomOverlay>
        <button
          className="btn btn-light px-4 ms-auto create-meeting-button"
          tabIndex={-1}
          type="submit"
          disabled={meetingName === '' || isLoading}
        >
          Create {spinner}
        </button>
      </BottomOverlay>
    </Form.Group>
  );
}
