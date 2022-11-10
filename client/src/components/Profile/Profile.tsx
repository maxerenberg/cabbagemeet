import { useEffect, useState } from "react";
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "app/hooks";
import BottomOverlay from "components/BottomOverlay";
import ButtonWithSpinner from "components/ButtonWithSpinner";
import GenericSpinner from "components/GenericSpinner";
import NonFocusButton from "components/NonFocusButton";
import {
  selectTokenIsPresent,
} from "slices/authentication";
import CreatedOrRespondedMeetings from "./CreatedOrRespondedMeetings";
import styles from './Profile.module.css';
import { useToast } from "components/Toast";
import { useGetSelfInfoQuery, useLogoutMutation } from "slices/api";
import { useGetSelfInfoIfTokenIsPresent } from "utils/auth.hooks";
import { getReqErrorMessage } from "utils/requests.utils";

export default function Profile() {
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const {data: userInfo, isError} = useGetSelfInfoQuery(undefined, {skip: !tokenIsPresent});
  const userInfoIsPresent = !!userInfo;
  const shouldBeRedirectedToHomePage = !tokenIsPresent || isError;
  const navigate = useNavigate();
  const [seeCreatedMeetings, setSeeCreatedMeetings] = useState(true);

  useEffect(() => {
    if (shouldBeRedirectedToHomePage) {
      navigate('/');
    }
  }, [shouldBeRedirectedToHomePage, navigate]);

  if (shouldBeRedirectedToHomePage) {
    return null;
  }

  if (!userInfoIsPresent) {
    return <GenericSpinner />;
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
  const [logout, {isLoading, isError, error}] = useLogoutMutation();
  const {data: userInfo} = useGetSelfInfoIfTokenIsPresent();
  const dispatch = useAppDispatch();
  const onSignoutClick = () => logout();
  const { showToast } = useToast();

  useEffect(() => {
    if (isError) {
      showToast({
        msg: `Failed to logout: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    }
  }, [isError, error, dispatch, showToast]);

  let visibilityClass = "visible";
  if (userInfo === null) {
    // To prevent "waterfalling" of network requests, we allow this component
    // to load even if user data has not loaded yet. If it turns out that
    // the user is not logged in, they will get redirected to the home page.
    visibilityClass = "invisible";
  }

  const signoutBtnDisabled = isLoading;

  return (
    <div className={`d-flex align-items-center ${visibilityClass}`}>
      <h4 className="mb-0">
        {userInfo?.name}&#39;s meetings
      </h4>
      <ButtonWithSpinner
        className="d-none d-md-block btn btn-outline-primary ms-auto"
        isLoading={signoutBtnDisabled}
        onClick={onSignoutClick}
      >
        Sign out
      </ButtonWithSpinner>
      <Link to="/me/settings" className="text-decoration-none">
        <button className="d-none d-md-block btn btn-primary custom-btn-min-width ms-3">
          Settings
        </button>
      </Link>
      <BottomOverlay>
        <Link to="/me/settings" className="text-decoration-none">
          <button className="btn btn-light custom-btn-min-width">
            Settings
          </button>
        </Link>
        <ButtonWithSpinner
          className="btn btn-light ms-auto"
          isLoading={signoutBtnDisabled}
          onClick={onSignoutClick}
        >
          Sign out
        </ButtonWithSpinner>
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
