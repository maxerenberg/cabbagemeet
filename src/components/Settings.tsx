import React, { useState, useEffect, useCallback } from "react";
import Form from 'react-bootstrap/Form';
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "app/hooks";
import ButtonSpinnerRight from "components/ButtonSpinnerRight";
import NonFocusButton from "components/NonFocusButton";
import DeleteAccountModal from "./DeleteAccountModal";
import {
  editName,
  resetEditNameStatus,
  selectEditNameError,
  selectEditNameState,
  selectIsLoggedIn,
  selectSubscribeToNotificationsState,
  selectSubscribeToNotificationsError,
  selectUserInfo,
  subscribeToNotifications,
  resetSubscribeToNotificationsStatus,
  unlinkGoogleCalendar,
  selectUnlinkGoogleCalendarState,
  selectUnlinkGoogleCalendarError,
  resetUnlinkGoogleCalendarStatus,
} from "slices/authentication";
import { assert } from "utils/misc";
import { useToast } from "./Toast";
import styles from './Settings.module.css';

export default function Settings() {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
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
  const userInfo = useAppSelector(selectUserInfo);
  assert(userInfo !== null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userInfo.name);
  const dispatch = useAppDispatch();
  const editStatus = useAppSelector(selectEditNameState);
  const editError = useAppSelector(selectEditNameError);
  const {showToast} = useToast();
  const onCancelClick = useCallback(() => {
    setIsEditing(false);
    setName(userInfo.name);
  }, [userInfo.name]);
  useEffect(() => {
    if (editStatus === 'succeeded') {
      showToast({
        msg: 'Successfully updated name',
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetEditNameStatus());
      onCancelClick();
    } else if (editStatus === 'failed') {
      showToast({
        msg: `Failed to update name: ${editError?.message ?? 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(resetEditNameStatus());
    }
  }, [editStatus, showToast, dispatch, onCancelClick, editError]);
  const onSaveClick = () => dispatch(editName(name));
  const isLoading = editStatus === 'loading';
  const spinner = isLoading && <ButtonSpinnerRight />;
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
                className="btn btn-outline-secondary ms-auto px-4"
                onClick={onCancelClick}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary ms-4 px-4"
                onClick={onSaveClick}
                disabled={isLoading}
              >
                Save {spinner}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-outline-primary ms-auto px-4"
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
  const userInfo = useAppSelector(selectUserInfo);
  assert(userInfo !== null);
  const unlinkGoogleCalendarState = useAppSelector(selectUnlinkGoogleCalendarState);
  const unlinkGoogleCalendarError = useAppSelector(selectUnlinkGoogleCalendarError);
  const dispatch = useAppDispatch();
  const {showToast} = useToast();
  useEffect(() => {
    if (unlinkGoogleCalendarState === 'succeeded') {
      dispatch(resetUnlinkGoogleCalendarStatus());
    } else if (unlinkGoogleCalendarState === 'failed') {
      showToast({
        msg: `Failed to unlink Google account: ${unlinkGoogleCalendarError?.message ?? 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(resetUnlinkGoogleCalendarStatus());
    }
  }, [unlinkGoogleCalendarState, unlinkGoogleCalendarError, dispatch, showToast]);
  const hasLinkedGoogleAccount = userInfo.hasLinkedGoogleAccount;
  const buttonVariant = hasLinkedGoogleAccount ? 'secondary' : 'primary';
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  if (hasLinkedGoogleAccount) {
    onClick = () => dispatch(unlinkGoogleCalendar());
  }
  const isLoading = unlinkGoogleCalendarState === 'loading';
  const spinner = isLoading && <ButtonSpinnerRight />;
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
          <NonFocusButton
            type="button"
            style={{minWidth: 'max-content'}}
            className={`btn btn-outline-${buttonVariant} w-100 w-md-auto mt-3 mt-md-0`}
            onClick={onClick}
          >
            {hasLinkedGoogleAccount ? 'Unlink' : 'Link'} Google Calendar {spinner}
          </NonFocusButton>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const userInfo = useAppSelector(selectUserInfo);
  assert(userInfo !== null);
  const isSubscribed = userInfo.isSubscribedToNotifications;
  const dispatch = useAppDispatch();
  const requestState = useAppSelector(selectSubscribeToNotificationsState);
  const error = useAppSelector(selectSubscribeToNotificationsError);
  const {showToast} = useToast();
  useEffect(() => {
    if (requestState === 'succeeded') {
      showToast({
        msg: (
          isSubscribed
            ? 'Successfully subscribed to notifications'
            : 'Successfully unsubscribed from notifications'
        ),
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSubscribeToNotificationsStatus());
    } else if (requestState === 'failed') {
      showToast({
        msg: (
          isSubscribed
            ? `Failed to unsubscribe from notifications: ${error?.message ?? 'unknown'}`
            : `Failed to subscribe from notifications: ${error?.message ?? 'unknown'}`
        ),
        msgType: 'failure',
      });
      dispatch(resetSubscribeToNotificationsStatus());
    }
  }, [requestState, showToast, isSubscribed, dispatch, error]);
  const isLoading = requestState === 'loading';
  const onClick = () => dispatch(subscribeToNotifications(!isSubscribed));
  const spinner = isLoading && <ButtonSpinnerRight />;
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
          <NonFocusButton
            type="button"
            style={{minWidth: 'max-content'}}
            className="btn btn-outline-primary w-100 w-md-auto mt-3 mt-md-0"
            onClick={onClick}
            disabled={isLoading}
          >
            {isSubscribed ? 'Unsubscribe from updates' : 'Subscribe to updates'}
            {spinner}
          </NonFocusButton>
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
            style={{minWidth: 'max-content'}}
            className="btn btn-outline-danger px-4 w-100 w-md-auto mt-3 mt-md-0"
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
