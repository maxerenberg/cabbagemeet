import React from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style, PeopleDateTimes } from 'common/types';
import {
  selectSelModeAndDateTimes,
  cancelSelection,
  selectOther,
} from 'slices/availabilitiesSelection';

function MeetingRespondents({
  availabilities,
  hoverDateTime,
  setHoverUser,
}: {
  availabilities: PeopleDateTimes,
  hoverDateTime: string | null,
  setHoverUser: (user: string | null) => void,
}) {
  const people = Object.keys(availabilities);
  const peopleForHover = new Set();
  if (hoverDateTime !== null) {
    for (const [person, dateTimes] of Object.entries(availabilities)) {
      if (dateTimes[hoverDateTime]) {
        peopleForHover.add(person);
      }
    }
  }
  const numPeopleForHover = Array.from(peopleForHover).length;
  const selMode = useAppSelector(state => selectSelModeAndDateTimes(state).selMode);
  const dispatch = useAppDispatch();
  if (people.length === 0) return null;
  let selectedUser: string | undefined;
  if (selMode.type === 'selectedOther' || selMode.type === 'editingOther') {
    selectedUser = selMode.otherUser;
  }
  return (
    <div className="respondents-container">
      <div style={{
        marginBottom: '2em',
        fontSize: '1.2em',
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
              style.color = 'forestgreen';
            }
            let className = '';
            if (!selectedUser && hoverDateTime && !peopleForHover.has(name)) {
              className = 'unavailable';
            }
            const onClick = () => {
              if (name === selectedUser) {
                dispatch(cancelSelection());
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
