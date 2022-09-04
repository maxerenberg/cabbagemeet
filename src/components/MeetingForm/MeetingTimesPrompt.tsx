import React, { useState } from 'react';
import { to12HourClock, today } from 'utils/dates';
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
  // from https://stackoverflow.com/a/34405528
  const tzAbbr = today.toLocaleTimeString('en-us', {timeZoneName: 'short'}).split(' ')[2];
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
    <div>
      <p className="create-meeting-question">Between which times would you like to meet?</p>
      <div style={{display: 'flex', alignItems: 'center'}}>
        <select value={to12HourClock(startTime)} onChange={onStartTimeChange}>
          {
            range(1, 13).map(i => (
              <option key={i}>{i}</option>
            ))
          }
        </select>
        <select value={startTimeSuffix} onChange={onStartTimeSuffixChange}>
          {
            ['AM', 'PM'].map(suffix => (
              <option key={suffix}>{suffix}</option>
            ))
          }
        </select>
        <p style={{padding: '0 1em', margin: '0'}}>to</p>
        <select value={to12HourClock(endTime)} onChange={onEndTimeChange}>
          {
            range(1, 13).map(i => (
              <option key={i}>{i}</option>
            ))
          }
        </select>
        <select value={endTimeSuffix} onChange={onEndTimeSuffixChange}>
          {
            ['AM', 'PM'].map(suffix => (
              <option key={suffix}>{suffix}</option>
            ))
          }
        </select>
        <p style={{padding: '0 1em', margin: '0'}}>{tzAbbr}</p>
      </div>
    </div>
  );
}
