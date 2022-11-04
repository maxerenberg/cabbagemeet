import React from 'react';
import Form from 'react-bootstrap/Form';

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
    <Form.Group controlId="meeting-about-prompt" className="create-meeting-form-group">
      <Form.Label className="create-meeting-question">
        What's your meeting about?
      </Form.Label>
      <Form.Control
        as="textarea"
        style={{width: '100%'}}
        rows={3}
        placeholder="Super important meeting to increase productivity"
        className="form-text-input"
        value={meetingAbout}
        onChange={onMeetingAboutChange}
      >
      </Form.Control>
    </Form.Group>
  );
}
