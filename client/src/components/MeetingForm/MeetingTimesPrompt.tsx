import { useEffect, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { to12HourClock, tzAbbr } from 'utils/dates.utils';
import { range } from 'utils/arrays.utils';

// startTime and endTime use a 24-hour clock [0, 23]
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
  return (
    <fieldset className="create-meeting-form-group">
      <legend className="create-meeting-question">Between which times would you like to meet?</legend>
      <div className="d-flex align-items-center">
        <TimePicker
          hour={startTime}
          setHour={setStartTime}
        />
        <p className="py-0 px-3 m-0">to</p>
        <TimePicker
          hour={endTime}
          setHour={setEndTime}
        />
        <p className="py-0 ps-3 m-0">{tzAbbr}</p>
      </div>
    </fieldset>
  );
}

function TimePicker({
  hour: hour24,  // [0, 23]
  setHour: setHour24,
}: {
  hour: number,
  setHour: (val: number) => void,
}) {
  const [show, setShow] = useState(false);
  const inputOrPickerClicked = useRef(false);
  useEffect(() => {
    const listener = () => {
      if (inputOrPickerClicked.current) {
        // Click happened inside of the input or picker
        // Open the picker or keep it open
        setShow(true);
        inputOrPickerClicked.current = false;
      } else {
        // Click happened outside of the input or picker
        // Close the picker if it was open
        setShow(false);
      }
    };
    document.body.addEventListener('click', listener);
    return () => {
      document.body.removeEventListener('click', listener);
    };
  }, []);
  // Use useRef instead of useState because the setHour12 callback would sometimes
  // use a stale value
  const hourSuffix = useRef<'am' | 'pm'>(hour24 < 12 ? 'am' : 'pm');
  const setHour12 = (hour12: number) => {
    if (hourSuffix.current === 'am') {
      setHour24(hour12 === 12 ? 0 : hour12);
    } else {
      setHour24(hour12 === 12 ? 12 : hour12 + 12);
    }
  };
  const hour12 = to12HourClock(hour24);  // [1, 12]
  const setHourSuffix = (suffix: 'am' | 'pm') => {
    hourSuffix.current = suffix;
    // update the parent's state
    setHour12(hour12);
  };
  const text = hour12 + ' ' + hourSuffix.current;
  return (
    <div className="position-relative">
      <Form.Control
        value={text}
        readOnly
        onClick={() => { inputOrPickerClicked.current = true; }}
      />
      <div
        // Make the picker grow upwards (via bottom: 0) instead of downwards so that
        // the bottom of the picker isn't touching the bottom of the viewport
        className={"position-absolute bottom-0 start-0 meeting-times-picker" + (show ? '' : ' d-none')}
        onClick={() => { inputOrPickerClicked.current = true; }}
      >
        <div className="meeting-times-picker-top">{text}</div>
        <div className="d-flex">
          <ol className="flex-grow-1 meeting-times-picker-left">
            {range(1, 13).map(i => (
              <li
                key={i}
                className={i === hour12 ? 'selected' : ''}
                onClick={() => setHour12(i)}
              >
                {String(i).padStart(2, '0')}
              </li>
            ))}
          </ol>
          <ol className="flex-grow-1 meeting-times-picker-right">
            {(['am', 'pm'] as const).map(suffix => (
              <li
                key={suffix}
                className={suffix === hourSuffix.current ? 'selected' : ''}
                onClick={() => setHourSuffix(suffix)}
              >
                {suffix}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
