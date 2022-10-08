import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from 'components/BottomOverlay';
import { selectSelectedDates } from 'slices/selectedDates';
import { setVisitedDayPicker } from 'slices/visitedDayPicker';
import './DayPicker.css';
import Calendar from './Calendar';

export default function DayPicker() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const atLeastOneDateSelected = useAppSelector(
    state => Object.keys(selectSelectedDates(state)).length > 0
  );
  const onClick = () => {
    dispatch(setVisitedDayPicker(true));
    navigate("/create");
  };

  return (
    <>
      <section className="d-flex align-items-center justify-content-center justify-content-md-between fs-4">
        <p className="mb-0">On which days would you like to meet?</p>
        <button
          className="btn btn-primary px-4 d-none d-md-block"
          onClick={onClick}
          disabled={!atLeastOneDateSelected}
        >
          Let's meet
        </button>
      </section>
      <section style={{marginTop: '4rem'}}>
        <Calendar />
      </section>
      <BottomOverlay>
        <Link to="/how-it-works" className="custom-link custom-link-inverted">How it works</Link>
        <button
          className="btn btn-light px-4"
          onClick={onClick}
          disabled={!atLeastOneDateSelected}
        >
          Let's meet
        </button>
      </BottomOverlay>
    </>
  );
};
