import React, { useEffect, useRef } from 'react';

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
    <div className="meeting-name-container">
      <input
        placeholder="Name your meeting"
        className="create-meeting-question form-text-input"
        style={{flexGrow: 1}}
        ref={inputElem}
        value={meetingName}
        onChange={onMeetingNameChange}
      />
      <button
        style={{marginLeft: '2em'}}
        tabIndex={-1}
        onClick={onSubmit}
        disabled={meetingName === '' || isLoading}
      >
        Create
      </button>
    </div>
  );
}
