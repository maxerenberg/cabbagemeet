import React from 'react';

export default function MeetingAboutPrompt({
  meetingAbout,
  setMeetingAbout,
}: {
  meetingAbout: string,
  setMeetingAbout: (about: string) => void },
) {
  const onMeetingAboutChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMeetingAbout(e.target.value);
  };
  return (
    <div>
      <p className="create-meeting-question">What's your meeting about?</p>
      <textarea
        style={{width: '100%'}}
        rows={3}
        placeholder="Super important meeting to increase productivity"
        className="form-text-input"
        value={meetingAbout}
        onChange={onMeetingAboutChange}
      >
      </textarea>
    </div>
  );
}
