import { getMonthAbbr } from 'utils/dates';

export default function MonthTitle({
  year,
  monthIdx,
  setYear,
  setMonthIdx,
  today,
}: {
  year: number,
  monthIdx: number,
  setYear: (year: number) => void,
  setMonthIdx: (month: number) => void,
  today: Date,
}) {
  const onLeftArrowClick = () => {
    if (monthIdx > 0) {
      setMonthIdx(monthIdx - 1);
    } else {
      setMonthIdx(11);
      setYear(year - 1);
    }
  };
  const isAfterCurrentMonth = monthIdx > today.getMonth() || year > today.getFullYear();
  const leftArrow = (
    <div
      style={{
        visibility: isAfterCurrentMonth ? 'visible' : 'hidden',
      }}
      className="daypicker-calendar-arrow"
      onClick={onLeftArrowClick}
    >&lt;</div>
  );
  const onRightArrowClick = () => {
    if (monthIdx < 11) {
      setMonthIdx(monthIdx + 1);
    } else {
      setMonthIdx(0);
      setYear(year + 1);
    }
  };
  const rightArrow = (
    <div
      className="daypicker-calendar-arrow"
      onClick={onRightArrowClick}
    >&gt;</div>
  );
  const monthAbbr = getMonthAbbr(monthIdx);
  return (
    <div style={{
      margin: '1.5em 0',
      textTransform: 'uppercase',
      textAlign: 'center',
      fontSize: '1.5em',
      color: 'forestgreen',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {leftArrow}
      {monthAbbr}
      {rightArrow}
    </div>
  )
};
