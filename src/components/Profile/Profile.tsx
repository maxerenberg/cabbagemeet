import { useEffect, useState } from "react";
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "app/hooks";
import BottomOverlay from "components/BottomOverlay";
import ButtonSpinnerRight from "components/ButtonSpinnerRight";
import NonFocusButton from "components/NonFocusButton";
import {
  selectAuth,
  selectLogoutState,
  selectLogoutError,
  submitLogout,
  setAuthRequestToIdle,
} from "slices/authentication";
import { assert } from 'utils/misc';
import CreatedOrRespondedMeetings from "./CreatedOrRespondedMeetings";
import styles from './Profile.module.css';
import { useToast } from "components/Toast";

export default function Profile() {
  const auth = useAppSelector(selectAuth);
  const navigate = useNavigate();
  const [seeCreatedMeetings, setSeeCreatedMeetings] = useState(true);

  useEffect(() => {
    if (auth.userID === null) {
      navigate('/');
    }
  }, [auth.userID, navigate]);

  if (auth.userID === null) {
    // User is about to be redirected
    return null;
  }

  return (
    <div className="flex-grow-1 d-flex flex-column">
      <Heading />
      <CreatedRespondedToggle {...{seeCreatedMeetings, setSeeCreatedMeetings}} />
      <div className="flex-grow-1 d-flex flex-column align-items-center">
        <CreatedOrRespondedMeetings showCreatedMeetings={seeCreatedMeetings} />
      </div>
    </div>
  );
};

function Heading() {
  const auth = useAppSelector(selectAuth);
  assert(auth.userID !== null);
  const dispatch = useAppDispatch();
  const onSignoutClick = () => dispatch(submitLogout());
  const logoutState = useAppSelector(selectLogoutState);
  const logoutError = useAppSelector(selectLogoutError);
  const { showToast } = useToast();

  useEffect(() => {
    if (logoutState === 'fulfilled') {
      dispatch(setAuthRequestToIdle());
    } else if (logoutState === 'rejected') {
      showToast({
        msg: `Failed to logout: ${logoutError!.message || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(setAuthRequestToIdle());
    }
  }, [logoutState, logoutError, dispatch, showToast]);

  const signoutBtnDisabled = logoutState === 'pending';
  const signoutBtnSpinner = signoutBtnDisabled && <ButtonSpinnerRight />;

  return (
    <div className="d-flex align-items-center">
      <h4 className="mb-0">
        {auth.name}&#39;s meetings
      </h4>
      <button
        className="d-none d-md-block btn btn-outline-primary px-3 ms-auto"
        disabled={signoutBtnDisabled}
        onClick={onSignoutClick}
      >
        Sign out {signoutBtnSpinner}
      </button>
      <Link to="/me/settings" className="text-decoration-none">
        <button className="d-none d-md-block btn btn-primary px-3 ms-3">
          Settings
        </button>
      </Link>
      <BottomOverlay>
        <Link to="/me/settings" className="text-decoration-none">
          <button className="btn btn-light px-3">
            Settings
          </button>
        </Link>
        <button
          className="btn btn-light px-3 ms-auto"
          disabled={signoutBtnDisabled}
          onClick={onSignoutClick}
        >
          Sign out {signoutBtnSpinner}
        </button>
      </BottomOverlay>
    </div>
  );
}

function CreatedRespondedToggle({
  seeCreatedMeetings,
  setSeeCreatedMeetings,
}: {
  seeCreatedMeetings: boolean,
  setSeeCreatedMeetings: (val: boolean) => void,
}) {
  const onCreatedClick = () => setSeeCreatedMeetings(true);
  const onRespondedClick = () => setSeeCreatedMeetings(false);
  return (
    <ButtonGroup
      className="d-flex justify-content-center mt-5"
      aria-label="Choose created or responded meetings"
    >
      <NonFocusButton
        className={`btn ${seeCreatedMeetings ? 'btn-primary' : 'btn-outline-primary'} flex-grow-0 ${styles.createdRespondedButton}`}
        onClick={onCreatedClick}
      >
        Created
      </NonFocusButton>
      <NonFocusButton
        className={`btn ${seeCreatedMeetings ? 'btn-outline-primary' : 'btn-primary'} flex-grow-0 ${styles.createdRespondedButton}`}
        onClick={onRespondedClick}
      >
        Responded
      </NonFocusButton>
    </ButtonGroup>
  );
}
