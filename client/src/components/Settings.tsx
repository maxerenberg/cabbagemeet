import React, { useState, useEffect, useCallback, useRef } from "react";
import Form from 'react-bootstrap/Form';
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "app/hooks";
import NonFocusButton from "components/NonFocusButton";
import DeleteAccountModal from "./DeleteAccountModal";
import {
  selectTokenIsPresent,
} from "slices/authentication";
import { assert } from "utils/misc.utils";
import { useToast } from "./Toast";
import styles from './Settings.module.css';
import GenericSpinner from "./GenericSpinner";
import { getReqErrorMessage, useMutationWithPersistentError } from "utils/requests.utils";
import { useEditUserMutation, useGetSelfInfoQuery, useLinkGoogleCalendarMutation, useLogoutMutation, useUnlinkGoogleCalendarMutation } from "slices/api";
import ButtonWithSpinner from "./ButtonWithSpinner";
import { useGetSelfInfoIfTokenIsPresent } from "utils/auth.hooks";

export default function Settings() {
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const {data: userInfo, isError} = useGetSelfInfoQuery(undefined, {skip: !tokenIsPresent});
  const userInfoIsPresent = !!userInfo;
  const shouldBeRedirectedToHomePage = !tokenIsPresent || isError;
  const navigate = useNavigate();

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
    <div className={styles.settings}>
      <GeneralSettings />
      <LinkedAccounts />
      <NotificationSettings />
      <AccountSettings />
    </div>
  );
};

function GeneralSettings() {
  const {data: userInfo} = useGetSelfInfoIfTokenIsPresent();
  assert(userInfo !== undefined);
  const [editUser, {isSuccess, isLoading, error}] = useEditUserMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [submittedAtLeastOnceSinceEditButtonWasClicked, setSubmittedAtLeastOnceSinceEditButtonWasClicked] = useState(false);
  const [name, setName] = useState(userInfo.name);
  const {showToast} = useToast();
  const onCancelClick = useCallback(() => {
    setIsEditing(false);
    setSubmittedAtLeastOnceSinceEditButtonWasClicked(false);
    setName(userInfo.name);
  }, [userInfo.name]);
  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Successfully updated name',
        msgType: 'success',
        autoClose: true,
      });
    }
  }, [isSuccess, showToast]);
  useEffect(() => {
    if (isSuccess) {
      onCancelClick();
    }
  }, [isSuccess, onCancelClick]);
  const onSaveClick = () => {
    editUser({name});
    setSubmittedAtLeastOnceSinceEditButtonWasClicked(true);
  };
  return (
    <div>
      <h4>General Settings</h4>
      <div className="mt-4 d-flex align-items-center">
        <h5 className="text-primary mt-2">
          {isEditing ? 'Edit Name' : 'Name'}
        </h5>
        {
          isEditing ? (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary ms-auto custom-btn-min-width"
                onClick={onCancelClick}
                disabled={isLoading}
              >
                Cancel
              </button>
              <ButtonWithSpinner
                className="btn btn-primary ms-4"
                onClick={onSaveClick}
                isLoading={isLoading}
              >
                Save
              </ButtonWithSpinner>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-outline-primary ms-auto custom-btn-min-width"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )
        }
      </div>
      {submittedAtLeastOnceSinceEditButtonWasClicked && error && (
        <p className="text-danger text-center mb-0 mt-2">An error occurred: {getReqErrorMessage(error)}</p>
      )}
      <div className="mt-3">
        {
          isEditing ? (
            <Form.Control
              onChange={(ev) => setName(ev.target.value)}
              value={name}
              autoFocus
            />
          ) : (
            <span>{userInfo.name}</span>
          )
        }
      </div>
    </div>
  )
}

function LinkedAccounts() {
  const {data: userInfo} = useGetSelfInfoIfTokenIsPresent();
  assert(userInfo !== undefined);
  const hasLinkedGoogleAccount = userInfo.hasLinkedGoogleAccount;
  const [
    unlinkCalendar,
    {
      isSuccess: unlink_isSuccess,
      isLoading: unlink_isLoading,
      error: unlink_error
    }
  ] = useMutationWithPersistentError(useUnlinkGoogleCalendarMutation);
  const [
    linkCalendar,
    {
      data: link_data,
      isSuccess: link_isSuccess,
      isLoading: link_isLoading,
      error: link_error
    }
  ] = useMutationWithPersistentError(useLinkGoogleCalendarMutation);
  const {showToast} = useToast();
  useEffect(() => {
    if (unlink_isSuccess) {
      showToast({
        msg: 'Successfully unlinked Google account',
        msgType: 'success',
        autoClose: true,
      });
    }
  }, [unlink_isSuccess, showToast]);
  useEffect(() => {
    if (link_isSuccess) {
      window.location.href = link_data!.redirect;
    }
  }, [link_data, link_isSuccess]);
  const buttonVariant = hasLinkedGoogleAccount ? 'secondary' : 'primary';
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  if (hasLinkedGoogleAccount) {
    onClick = () => unlinkCalendar();
  } else {
    onClick = () => linkCalendar({
      post_redirect: window.location.pathname
    });
  }
  const error = link_error || unlink_error;
  const btnDisabled = link_isLoading || link_isSuccess || unlink_isLoading;
  return (
    <div>
      <h4>Linked Accounts</h4>
      <div className="mt-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <h5 className="text-primary">Google</h5>
          <ButtonWithSpinner
            as="NonFocusButton"
            style={{minWidth: 'max-content'}}
            className={`btn btn-outline-${buttonVariant} w-100-md-down mt-3 mt-md-0`}
            onClick={onClick}
            isLoading={btnDisabled}
          >
            {hasLinkedGoogleAccount ? 'Unlink' : 'Link'} Google Calendar
          </ButtonWithSpinner>
        </div>
        {error && (
          <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
        )}
        <p className="mt-4">
          Link your Google account to view your Google calendar events
          when adding your availabilities.
        </p>
        <small>
          Your Google profile information will only be used to create, read and update
          your Google calendar events.
        </small>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const {data: userInfo} = useGetSelfInfoIfTokenIsPresent();
  assert(userInfo !== undefined);
  const isSubscribed = userInfo.isSubscribedToNotifications;
  // The ref is used to avoid running the useEffect hook twice upon a
  // successful request
  const isSubscribedRef = useRef(isSubscribed);
  const [editUser, {isSuccess, isLoading, error}] = useMutationWithPersistentError(useEditUserMutation);
  const {showToast} = useToast();
  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: (
          isSubscribedRef.current
            ? 'Successfully unsubscribed from notifications'
            : 'Successfully subscribed to notifications'
        ),
        msgType: 'success',
        autoClose: true,
      });
      isSubscribedRef.current = !isSubscribedRef.current;
    }
  }, [isSuccess, showToast]);
  const onClick = () => editUser({
    subscribe_to_notifications: !isSubscribed
  });
  return (
    <div>
      <h4>Notification Settings</h4>
      <div className="mt-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <h5 className="text-primary">Email Updates</h5>
          <ButtonWithSpinner
            as="NonFocusButton"
            style={{minWidth: 'max-content'}}
            className="btn btn-outline-primary w-100-md-down mt-3 mt-md-0"
            onClick={onClick}
            isLoading={isLoading}
          >
            {isSubscribed ? 'Unsubscribe from updates' : 'Subscribe to updates'}
          </ButtonWithSpinner>
        </div>
        {error && (
          <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
        )}
        <p className="mt-3">
          {
            isSubscribed
              ? 'You will be notified by email when events are scheduled.'
              : 'You will not be notified when events are scheduled.'
          }
        </p>
      </div>
    </div>
  );
}

function AccountSettings() {
  const [showModal, setShowModal] = useState(false);
  const onDeleteClick = () => setShowModal(true);
  const [signout, {isLoading, error}] = useMutationWithPersistentError(useLogoutMutation);
  const onSignoutClick = () => signout(true);
  return (
    <div>
      <h4>Account Settings</h4>
      <div className="mt-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <h5 className="text-primary">Sign out everywhere</h5>
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-outline-primary custom-btn-min-width w-100-md-down mt-3 mt-md-0"
            onClick={onSignoutClick}
            isLoading={isLoading}
          >
            Sign out
          </ButtonWithSpinner>
        </div>
        {error && (
          <p className="text-danger text-center mt-3">An error occurred: {getReqErrorMessage(error)}</p>
        )}
        <p className="mt-3">
          This will log you out on all devices. All existing sessions will be invalidated.
        </p>
      </div>
      <div className="mt-5">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <h5 className="text-primary">Delete Account</h5>
          <NonFocusButton
            type="button"
            className="btn btn-outline-danger custom-btn-min-width w-100-md-down mt-3 mt-md-0"
            onClick={onDeleteClick}
          >
            Delete
          </NonFocusButton>
        </div>
        <p className="mt-3">
          This will permanently delete your account, your events and
          your poll responses.
        </p>
      </div>
      <DeleteAccountModal show={showModal} setShow={setShowModal} />
    </div>
  );
}
