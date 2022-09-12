import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style } from 'common/types';
import {
  selectSelModeAndDateTimes,
  resetSelection,
  selectOther,
} from 'slices/availabilitiesSelection';

type DateTimePeopleSet = {
  [dateTime: string]: {
    [person: string]: true,
  }
};

function MeetingRespondents({
  hoverDateTime,
  setHoverUser,
}: {
  hoverDateTime: string | null,
  setHoverUser: (user: string | null) => void,
}) {
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
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const dispatch = useAppDispatch();

  if (people.length === 0) return null;
  if (selMode.type !== 'none') {
    // If the user is editing availabilities, or has selected a user,
    // we don't show the other respondents' availabilities
    hoverDateTime = null;
  }
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
            const onClick = () => {
              if (name === selectedUser) {
                dispatch(resetSelection());
              } else {
                dispatch(selectOther({otherUser: name}));
              }
            };
            return (
              <li
                key={name}
                className={className}
                style={style}
                onMouseEnter={() => setHoverUser(name)}
                onMouseLeave={() => setHoverUser(null)}
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
