import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import { to12HourClock, tzAbbr } from 'utils/dates';
import { range } from 'utils/arrays';

// startTime and endTime use a 24-hour clock
export default function MeetingTimesPrompt({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
}: {
  startTime: number,
  setStartTime: (time: number) => void,
  endTime: number,
  setEndTime: (time: number) => void,
}) {
  const [startTimeSuffix, setStartTimeSuffix] = useState('AM');
  const [endTimeSuffix, setEndTimeSuffix] = useState('PM');
  const onStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStartTime(Number(e.target.value) + (startTimeSuffix === 'AM' ? 0 : 12));
  };
  const onStartTimeSuffixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStartTimeSuffix(e.target.value);
    if (e.target.value === 'AM' && startTime >= 12) {
      setStartTime(startTime - 12);
    } else if (e.target.value === 'PM' && startTime < 12) {
      setStartTime(startTime + 12);
    }
  };
  const onEndTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEndTime(Number(e.target.value) + (endTimeSuffix === 'AM' ? 0 : 12));
  }
  const onEndTimeSuffixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEndTimeSuffix(e.target.value);
    if (e.target.value === 'AM' && endTime >= 12) {
      setEndTime(endTime - 12);
    } else if (e.target.value === 'PM' && endTime < 12) {
      setEndTime(endTime + 12);
    }
  };
  return (
    <fieldset>
      <legend className="create-meeting-question">Between which times would you like to meet?</legend>
      <div className="d-flex align-items-center">
        <Form.Select value={to12HourClock(startTime)} onChange={onStartTimeChange} className="meeting-times-prompt-select">
          {
            range(1, 13).map(i => (
              <option key={i}>{i}</option>
            ))
          }
        </Form.Select>
        <Form.Select value={startTimeSuffix} onChange={onStartTimeSuffixChange} className="meeting-times-prompt-select ms-1">
          {
            ['AM', 'PM'].map(suffix => (
              <option key={suffix}>{suffix}</option>
            ))
          }
        </Form.Select>
        <p className="py-0 px-3 m-0">to</p>
        <Form.Select value={to12HourClock(endTime)} onChange={onEndTimeChange} className="meeting-times-prompt-select">
          {
            range(1, 13).map(i => (
              <option key={i}>{i}</option>
            ))
          }
        </Form.Select>
        <Form.Select value={endTimeSuffix} onChange={onEndTimeSuffixChange} className="meeting-times-prompt-select ms-1">
          {
            ['AM', 'PM'].map(suffix => (
              <option key={suffix}>{suffix}</option>
            ))
          }
        </Form.Select>
        <p className="py-0 ps-3 m-0">{tzAbbr}</p>
      </div>
    </fieldset>
  );
}
