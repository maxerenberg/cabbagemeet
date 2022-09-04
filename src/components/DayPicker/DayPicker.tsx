import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { setVisitedDayPicker, selectSelectedDates } from 'slices/selectedDates';
import './DayPicker.css';
import Calendar from './Calendar';

export default function DayPicker() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const atLeastOneDateSelected = useAppSelector(
    state => Object.keys(selectSelectedDates(state)).length > 0
  );
  
  useEffect(() => {
    dispatch(setVisitedDayPicker());  
  }, [dispatch]);
  
  return (
    <div>
      <section className="daypicker-main-row">
        <p>On which days would you like to meet?</p>
        <button
          onClick={() => navigate("/create")}
          disabled={!atLeastOneDateSelected}
        >
          Let's meet
        </button>
      </section>
      <section className="daypicker-calendar-container">
        <Calendar />
      </section>
    </div>
  );
};
