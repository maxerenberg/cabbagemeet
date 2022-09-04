import React from 'react';
import { getDateString } from 'utils/dates';
import { useAppDispatch } from 'app/hooks';
import { addDate, removeDate } from 'slices/selectedDates';

type NonEmptyCalendarCellProps = {
  year: number;
  month: number;
  day: number;
  isDisabled: boolean;
  isSelected: boolean;
};
type EmptyCalendarCellProps = {
  isEmpty: true;
};
type CalendarCellProps = NonEmptyCalendarCellProps | EmptyCalendarCellProps;

function isEmptyCalendarCellProps(props: CalendarCellProps): props is EmptyCalendarCellProps {
  return props.hasOwnProperty('isEmpty');
}

function CalendarCell(props: CalendarCellProps) {
  const isEmpty = isEmptyCalendarCellProps(props);
  const isNonEmpty = !isEmpty;
  const {
    isDisabled,
    isSelected
  } = isNonEmpty ? props : {
    isDisabled: false,
    isSelected: false,
  };
  const dispatch = useAppDispatch();
  
  const onClick = () => {
    if (isEmpty || isDisabled) {
      return;
    }
    const dateString = getDateString(props.year, props.month, props.day);
    if (isSelected) {
      dispatch(removeDate(dateString));
    } else {
      dispatch(addDate(dateString));
    }
  };
  return (
    <div className="daypicker-calendar__cell">
      {isNonEmpty && (
        <div
          className={"daypicker-calendar__cell__button " + (
            isDisabled ? "disabled" : (isSelected ? "selected" : " unselected")
          )}
          onClick={onClick}
        >
          {props.day}
        </div>
      )}
    </div>
  );
};
export default React.memo(CalendarCell);
