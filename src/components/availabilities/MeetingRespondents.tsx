import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style } from 'common/types';
import {
  selectSelMode,
  selectHoverDateTime,
  setHoverUser,
  resetSelection,
  selectOther,
} from 'slices/availabilitiesSelection';

type DateTimePeopleSet = {
  [dateTime: string]: {
    [person: string]: true,
  }
};

function MeetingRespondents() {
  const availabilities = useAppSelector(state => state.meetingTimes.availabilities);
  const people = Object.keys(availabilities);
  const dateTimePeople: DateTimePeopleSet = useMemo(() => {
    const result: DateTimePeopleSet = {};
    for (const [person, dateTimes] of Object.entries(availabilities)) {
      for (const dateTime of Object.keys(dateTimes)) {
        if (!result.hasOwnProperty(dateTime)) {
          result[dateTime] = {};
        }
        result[dateTime][person] = true;
      }
    }
    return result;
  }, [availabilities]);
  const selMode = useAppSelector(selectSelMode);
  const hoverDateTime = useAppSelector(selectHoverDateTime);
  const dispatch = useAppDispatch();

  if (people.length === 0) return null;
  let selectedUser: string | undefined;
  if (selMode.type === 'selectedOther' || selMode.type === 'editingOther') {
    selectedUser = selMode.otherUser;
  }
  const numPeopleForHover =
    hoverDateTime !== null && dateTimePeople.hasOwnProperty(hoverDateTime)
    ? Object.keys(dateTimePeople[hoverDateTime]).length
    : 0;
  return (
    <div className="respondents-container">
      <div style={{
        marginTop: '1em',
        marginBottom: '2em',
        fontSize: '1.2em',
        width: '9em',
      }}>
        Respondents (
          {(!selectedUser && hoverDateTime) ? numPeopleForHover + '/' : ''}
          {people.length}
        )
      </div>
      <ul>
        {
          people.map(name => {
            const style: Style = {};
            if (name === selectedUser) {
              style.color = 'var(--custom-primary)';
            }
            let className = '';
            if (
              selectedUser === undefined
              && hoverDateTime !== null
              && !(
                dateTimePeople.hasOwnProperty(hoverDateTime)
                && dateTimePeople[hoverDateTime][name]
              )
            ) {
              className = 'unavailable';
            }
            let onClick: React.MouseEventHandler | undefined;
            if (name === selectedUser) {
              onClick = () => dispatch(resetSelection());
            } else {
              onClick = () => dispatch(selectOther({otherUser: name}));
            }
            let onMouseEnter: React.MouseEventHandler | undefined;
            let onMouseLeave: React.MouseEventHandler | undefined;
            if (selMode.type === 'none') {
              onMouseEnter = () => dispatch(setHoverUser(name));
              onMouseLeave = () => dispatch(setHoverUser(null));
            }
            return (
              <li
                key={name}
                className={className}
                style={style}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
              >
                {name}
              </li>
            );
          })
        }
      </ul>
    </div>
  );
}
export default React.memo(MeetingRespondents);
