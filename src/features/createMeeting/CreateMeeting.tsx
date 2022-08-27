import React, { useEffect, useRef, useState } from 'react';
import { createMeeting, resetCreateMeetingStatus } from '../daypicker/meetingTimesSlice';
import './CreateMeeting.css';
import '../../common/common.css';
import { useNavigate } from 'react-router-dom';
import { range, to12HourClock } from '../daypicker/dateUtils';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { unwrapResult } from '@reduxjs/toolkit';

export default function CreateMeetingPage() {
  const [meetingName, setMeetingName] = useState('');
  const [meetingAbout, setMeetingAbout] = useState('');
  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime] = useState(17);
  const dispatch = useAppDispatch();
  const createMeetingStatus = useAppSelector(state => state.meetingTimes.createMeetingStatus);
  const error = useAppSelector(state => state.meetingTimes.error);
  const navigate = useNavigate();

  if (createMeetingStatus === 'succeeded') {
    // we're about to switch to a different URL
    return null;
  } else if (createMeetingStatus === 'failed') {
    return (
      <div className="create-meeting-page">
        An error occurred while creating the meeting: {error}
      </div>
    );
  }
  const onSubmit = async () => {
    try {
      const resultAction = await dispatch(createMeeting({
        startTime,
        endTime,
        name: meetingName,
        about: meetingAbout,
      }));
      const payload = unwrapResult(resultAction);
      const meetingID = payload.id;
      dispatch(resetCreateMeetingStatus());
      navigate('/m/' + meetingID);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="create-meeting-page">
      <MeetingNamePrompt
        meetingName={meetingName}
        setMeetingName={setMeetingName}
        onSubmit={onSubmit}
        isLoading={createMeetingStatus === 'loading'}
      />
      <MeetingAboutPrompt
        meetingAbout={meetingAbout}
        setMeetingAbout={setMeetingAbout}
      />
      <MeetingTimesPrompt
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
      />
    </div>
  );
}

function MeetingNamePrompt({
  meetingName, setMeetingName, onSubmit, isLoading,
}: {
  meetingName: string, setMeetingName: (name: string) => void,
  onSubmit: () => void, isLoading: boolean,
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

function MeetingAboutPrompt({
  meetingAbout, setMeetingAbout
}: { meetingAbout: string, setMeetingAbout: (about: string) => void }) {
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

function MeetingTimesPrompt({
  startTime, setStartTime, endTime, setEndTime
}: {
  startTime: number, setStartTime: (time: number) => void,
  endTime: number, setEndTime: (time: number) => void
}) {
  const today = new Date();
  // from https://stackoverflow.com/a/34405528
  const tzAbbr = today.toLocaleTimeString('en-us',{timeZoneName:'short'}).split(' ')[2];
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
            range(12).map(i => (
              <option key={i+1}>{i+1}</option>
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
            range(12).map(i => (
              <option key={i+1}>{i+1}</option>
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
