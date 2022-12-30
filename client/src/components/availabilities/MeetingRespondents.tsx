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
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { assert } from 'utils/misc.utils';

type DateTimePeopleSet = {
  [dateTime: string]: {
    [userID: string]: true,
  }
};

function MeetingRespondents() {
  const {respondents} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({respondents: meeting?.respondents})
  );
  assert(respondents !== undefined);
  const respondentIDs = Object.keys(respondents).map(s => +s);
  const dateTimePeople: DateTimePeopleSet = useMemo(() => {
    const result: DateTimePeopleSet = {};
    for (const [respondentID, respondent] of Object.entries(respondents)) {
      for (const dateTime of Object.keys(respondent.availabilities)) {
        if (!result.hasOwnProperty(dateTime)) {
          result[dateTime] = {};
        }
        result[dateTime][respondentID] = true;
      }
    }
    return result;
  }, [respondents]);
  const selMode = useAppSelector(selectSelMode);
  // TODO: ignore hoverDateTime if selMode is not relevant
  const hoverDateTime = useAppSelector(selectHoverDateTime);
  const dispatch = useAppDispatch();

  if (respondentIDs.length === 0) return null;
  let selectedRespondentID: number | undefined;
  if (selMode.type === 'selectedUser') {
    selectedRespondentID = selMode.selectedRespondentID;
  } else if (selMode.type === 'editingRespondent') {
    selectedRespondentID = selMode.respondentID;
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
          {(!selectedRespondentID && hoverDateTime) ? numPeopleForHover + '/' : ''}
          {respondentIDs.length}
        )
      </div>
      <ul>
        {
          respondentIDs.map(respondentID => {
            const style: Style = {};
            if (respondentID === selectedRespondentID) {
              style.color = 'var(--custom-primary)';
            }
            let className = '';
            if (
              selectedRespondentID === undefined
              && hoverDateTime !== null
              && !(
                dateTimePeople.hasOwnProperty(hoverDateTime)
                && dateTimePeople[hoverDateTime][respondentID]
              )
            ) {
              className = 'unavailable';
            }
            let onClick: React.MouseEventHandler | undefined;
            if (respondentID === selectedRespondentID) {
              onClick = () => dispatch(resetSelection());
            } else {
              // TODO: disable clicking on a respondent if a request is in-flight
              onClick = () => dispatch(selectUser({respondentID}));
            }
            let onMouseEnter: React.MouseEventHandler | undefined;
            let onMouseLeave: React.MouseEventHandler | undefined;
            if (selMode.type === 'none') {
              onMouseEnter = () => dispatch(setHoverUser(respondentID));
              onMouseLeave = () => dispatch(setHoverUser(null));
            }
            return (
              <li
                key={respondentID}
                className={className}
                style={style}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
              >
                {respondents[respondentID].name}
              </li>
            );
          })
        }
      </ul>
    </div>
  );
}
export default React.memo(MeetingRespondents);
