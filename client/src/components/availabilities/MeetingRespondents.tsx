import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style } from 'common/types';
import {
  selectSelMode,
  selectHoverDateTime,
  setHoverUser,
  resetSelection,
  selectUser,
} from 'slices/availabilitiesSelection';

type DateTimePeopleSet = {
  [dateTime: string]: {
    [userID: string]: true,
  }
};

function MeetingRespondents() {
  const availabilities = useAppSelector(state => state.meetingTimes.availabilities);
  const userInfos = useAppSelector(state => state.meetingTimes.people);
  const userIDs = Object.keys(availabilities);
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
  // TODO: ignore hoverDateTime if selMode is not relevant
  const hoverDateTime = useAppSelector(selectHoverDateTime);
  const dispatch = useAppDispatch();

  if (userIDs.length === 0) return null;
  let selectedUserID: string | undefined;
  if (selMode.type === 'selectedUser') {
    selectedUserID = selMode.selectedUserID;
  } else if (selMode.type === 'editingOther' || selMode.type === 'submittingOther') {
    selectedUserID = selMode.otherUserID;
  }
  const numPeopleForHover =
    hoverDateTime !== null && dateTimePeople.hasOwnProperty(hoverDateTime)
    ? Object.keys(dateTimePeople[hoverDateTime]).length
    : 0;
  return (
    <div className="respondents-container flex-md-shrink-0">
      <div style={{
        marginTop: '1em',
        marginBottom: '2em',
        fontSize: '1.2em',
        width: '9em',
      }}>
        Respondents (
          {(!selectedUserID && hoverDateTime) ? numPeopleForHover + '/' : ''}
          {userIDs.length}
        )
      </div>
      <ul>
        {
          userIDs.map(userID => {
            const style: Style = {};
            if (userID === selectedUserID) {
              style.color = 'var(--custom-primary)';
            }
            let className = '';
            if (
              selectedUserID === undefined
              && hoverDateTime !== null
              && !(
                dateTimePeople.hasOwnProperty(hoverDateTime)
                && dateTimePeople[hoverDateTime][userID]
              )
            ) {
              className = 'unavailable';
            }
            let onClick: React.MouseEventHandler | undefined;
            if (userID === selectedUserID) {
              onClick = () => dispatch(resetSelection());
            } else {
              onClick = () => dispatch(selectUser({userID}));
            }
            let onMouseEnter: React.MouseEventHandler | undefined;
            let onMouseLeave: React.MouseEventHandler | undefined;
            if (selMode.type === 'none') {
              onMouseEnter = () => dispatch(setHoverUser(userID));
              onMouseLeave = () => dispatch(setHoverUser(null));
            }
            return (
              <li
                key={userID}
                className={className}
                style={style}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
              >
                {userInfos[userID].name}
              </li>
            );
          })
        }
      </ul>
    </div>
  );
}
export default React.memo(MeetingRespondents);
