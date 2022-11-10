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
import { getReqErrorMessage } from "utils/requests.utils";
import { useEditUserMutation, useGetSelfInfoQuery, useLinkGoogleCalendarMutation, useUnlinkGoogleCalendarMutation } from "slices/api";
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
  const [editUser, {isSuccess, isLoading, isError, error}] = useEditUserMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userInfo.name);
  const {showToast} = useToast();
  const onCancelClick = useCallback(() => {
    setIsEditing(false);
    setName(userInfo.name);
  }, [userInfo.name]);
  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Successfully updated name',
        msgType: 'success',
        autoClose: true,
      });
    } else if (isError) {
      showToast({
        msg: `Failed to update name: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    }
  }, [isSuccess, isError, error, showToast]);
  useEffect(() => {
    if (isSuccess) {
      onCancelClick();
    }
  }, [isSuccess, onCancelClick]);
  const onSaveClick = () => editUser({name});
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
      isError: unlink_isError,
      error: unlink_error
    }
  ] = useUnlinkGoogleCalendarMutation();
  const [
    linkCalendar,
    {
      data: link_data,
      isSuccess: link_isSuccess,
      isLoading: link_isLoading,
      isError: link_isError,
      error: link_error
    }
  ] = useLinkGoogleCalendarMutation();
  const {showToast} = useToast();
  useEffect(() => {
    if (unlink_isSuccess) {
      showToast({
        msg: 'Successfully unlinked Google account',
        msgType: 'success',
        autoClose: true,
      });
    } else if (unlink_isError) {
      showToast({
        msg: `Failed to unlink Google account: ${getReqErrorMessage(unlink_error!)}`,
        msgType: 'failure',
      });
    }
  }, [unlink_isSuccess, unlink_isError, unlink_error, showToast]);
  useEffect(() => {
    if (link_isSuccess) {
      window.location.href = link_data!.redirect;
    } else if (link_isError) {
      showToast({
        msg: `Failed to link Google account: ${getReqErrorMessage(link_error!)}`,
        msgType: 'failure',
      });
    }
  }, [link_data, link_isSuccess, link_isError, link_error, showToast]);
  const buttonVariant = hasLinkedGoogleAccount ? 'secondary' : 'primary';
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  if (hasLinkedGoogleAccount) {
    onClick = () => unlinkCalendar();
  } else {
    onClick = () => linkCalendar({
      post_redirect: window.location.pathname
    });
  }
  const btnDisabled = link_isLoading || link_isSuccess || unlink_isLoading;
  return (
    <div>
      <h4>Linked Accounts</h4>
      <div className="mt-4 d-md-flex">
        <div className="flex-md-grow-1">
          <h5 className="text-primary mt-2">Google</h5>
          <p className="mt-3">
            Link your Google account to view your Google calendar events
            when adding your availabilities.
          </p>
          <small>
            Your Google profile information will only be used to create, read and update
            your Google calendar events.
          </small>
        </div>
        <div className="flex-md-shrink-0">
          <ButtonWithSpinner
            as="NonFocusButton"
            style={{minWidth: 'max-content'}}
            className={`btn btn-outline-${buttonVariant} w-100 w-md-auto mt-3 mt-md-0`}
            onClick={onClick}
            isLoading={btnDisabled}
          >
            {hasLinkedGoogleAccount ? 'Unlink' : 'Link'} Google Calendar
          </ButtonWithSpinner>
        </div>
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
  const [editUser, {isSuccess, isLoading, isError, error}] = useEditUserMutation();
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
    } else if (isError) {
      showToast({
        msg: (
          isSubscribedRef.current
            ? `Failed to subscribe to notifications: ${getReqErrorMessage(error!)}`
            : `Failed to unsubscribe from notifications: ${getReqErrorMessage(error!)}`
        ),
        msgType: 'failure',
      });
    }
  }, [isSuccess, isError, error, showToast]);
  const onClick = () => editUser({
    subscribe_to_notifications: !isSubscribed
  });
  return (
    <div>
      <h4>Notification Settings</h4>
      <div className="mt-4 d-md-flex">
        <div className="flex-md-grow-1">
          <h5 className="text-primary mt-2">Email Updates</h5>
          <p className="mt-3">
            {
              isSubscribed
                ? 'You will be notified by email when events are scheduled.'
                : 'You will not be notified when events are scheduled.'
            }
          </p>
        </div>
        <div className="flex-md-shrink-0">
          <ButtonWithSpinner
            as="NonFocusButton"
            style={{minWidth: 'max-content'}}
            className="btn btn-outline-primary w-100 w-md-auto mt-3 mt-md-0"
            onClick={onClick}
            isLoading={isLoading}
          >
            {isSubscribed ? 'Unsubscribe from updates' : 'Subscribe to updates'}
          </ButtonWithSpinner>
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  const [showModal, setShowModal] = useState(false);
  const onClose = () => setShowModal(false);
  const onDeleteClick = () => setShowModal(true);
  return (
    <div>
      <h4>Account Settings</h4>
      <div className="mt-4 d-md-flex">
        <div className="flex-md-grow-1">
          <h5 className="text-primary mt-2">Delete Account</h5>
          <p className="mt-3">
            This will permanently delete your account, your events and
            your poll responses.
          </p>
        </div>
        <div className="flex-md-shrink-0">
          <NonFocusButton
            type="button"
            className="btn btn-outline-danger custom-btn-min-width w-100 w-md-auto mt-3 mt-md-0"
            onClick={onDeleteClick}
          >
            Delete
          </NonFocusButton>
        </div>
      </div>
      {showModal && <DeleteAccountModal onClose={onClose} />}
    </div>
  );
}
