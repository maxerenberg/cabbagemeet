import React, { useState, useEffect, useCallback, useRef } from "react";
import Form from 'react-bootstrap/Form';
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "app/hooks";
import NonFocusButton from "components/NonFocusButton";
import DeleteAccountModal from "./DeleteAccountModal";
import {
  selectTokenIsPresent,
} from "slices/authentication";
import { assert, capitalize } from "utils/misc.utils";
import { useToast } from "./Toast";
import styles from './Settings.module.css';
import GenericSpinner from "./GenericSpinner";
import { getReqErrorMessage, useMutationWithPersistentError } from "utils/requests.utils";
import {
  useEditUserMutation,
  useGetSelfInfoQuery,
  useLogoutMutation,
  useLinkGoogleCalendarMutation,
  useUnlinkGoogleCalendarMutation,
  useLinkMicrosoftCalendarMutation,
  useUnlinkMicrosoftCalendarMutation,
} from "slices/api";
import ButtonWithSpinner from "./ButtonWithSpinner";
import { useGetSelfInfoIfTokenIsPresent } from "utils/auth.hooks";
import { calendarProductNames, OAuth2Provider } from "utils/oauth2-common";

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
  const [editUser, {isSuccess, isLoading, error, reset}] = useEditUserMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userInfo.name);
  const {showToast} = useToast();
  const onCancelClick = useCallback(() => {
    setIsEditing(false);
    reset();
    setName(userInfo.name);
  }, [reset, userInfo.name]);
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
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    editUser({name});
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
                type="submit"
                form="edit-name"
                className="btn btn-primary ms-4"
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
      {error && (
        <p className="text-danger text-center mb-0 mt-2">An error occurred: {getReqErrorMessage(error)}</p>
      )}
      {isEditing ? (
        <Form className="mt-3" id="edit-name" onSubmit={onSubmit}>
          <Form.Control
            onChange={(ev) => setName(ev.target.value)}
            value={name}
            autoFocus
          />
        </Form>
      ) : (
        <div className="mt-3">
          <span>{userInfo.name}</span>
        </div>
      )}
    </div>
  )
}

function LinkedAccounts() {
  const {data: userInfo} = useGetSelfInfoIfTokenIsPresent();
  assert(userInfo !== undefined);
  return (
    <div>
      <h4>Linked Accounts</h4>
      <LinkedAccount
        provider="google"
        hasLinkedAccount={userInfo.hasLinkedGoogleAccount}
        useLinkCalendarMutation={useLinkGoogleCalendarMutation}
        useUnlinkCalendarMutation={useUnlinkGoogleCalendarMutation}
      />
      <LinkedAccount
        provider="microsoft"
        hasLinkedAccount={userInfo.hasLinkedMicrosoftAccount}
        useLinkCalendarMutation={useLinkMicrosoftCalendarMutation}
        useUnlinkCalendarMutation={useUnlinkMicrosoftCalendarMutation}
      />
    </div>
  );
}

function LinkedAccount({
  provider,
  hasLinkedAccount,
  useLinkCalendarMutation,
  useUnlinkCalendarMutation,
}: {
  provider: OAuth2Provider,
  hasLinkedAccount: boolean,
  useLinkCalendarMutation: typeof useLinkGoogleCalendarMutation,
  useUnlinkCalendarMutation: typeof useUnlinkGoogleCalendarMutation,
}) {
  const [
    unlinkCalendar,
    {
      isSuccess: unlink_isSuccess,
      isLoading: unlink_isLoading,
      error: unlink_error
    }
  ] = useMutationWithPersistentError(useUnlinkCalendarMutation);
  const [
    linkCalendar,
    {
      data: link_data,
      isSuccess: link_isSuccess,
      isLoading: link_isLoading,
      error: link_error
    }
  ] = useMutationWithPersistentError(useLinkCalendarMutation);
  const {showToast} = useToast();
  const capitalizedProvider = capitalize(provider);
  useEffect(() => {
    if (unlink_isSuccess) {
      showToast({
        msg: `Successfully unlinked ${capitalizedProvider} account`,
        msgType: 'success',
        autoClose: true,
      });
    }
  }, [unlink_isSuccess, showToast, capitalizedProvider]);
  useEffect(() => {
    if (link_isSuccess) {
      window.location.href = link_data!.redirect;
    }
  }, [link_data, link_isSuccess]);
  const calendarProductName = calendarProductNames[provider] ?? capitalizedProvider;
  const buttonVariant = hasLinkedAccount ? 'secondary' : 'primary';
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  if (hasLinkedAccount) {
    onClick = () => unlinkCalendar();
  } else {
    onClick = () => linkCalendar({
      post_redirect: window.location.pathname
    });
  }
  const error = link_error || unlink_error;
  const btnDisabled = link_isLoading || link_isSuccess || unlink_isLoading;
  return (
    <div className="mt-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between">
        <h5 className="text-primary">{capitalizedProvider}</h5>
        <ButtonWithSpinner
          as="NonFocusButton"
          style={{minWidth: 'max-content'}}
          className={`btn btn-outline-${buttonVariant} w-100-md-down mt-3 mt-md-0`}
          onClick={onClick}
          isLoading={btnDisabled}
        >
          {hasLinkedAccount ? 'Unlink' : 'Link'} {calendarProductName} Calendar
        </ButtonWithSpinner>
      </div>
      {error && (
        <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
      )}
      <p className="mt-4">
        Link your {capitalizedProvider} account to view your {calendarProductName} calendar events
        when adding your availabilities.
      </p>
      <small>
        Your {capitalizedProvider} profile information will only be used to create, read and update
        your {calendarProductName} calendar events.
      </small>
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
          <h5 className="text-primary">Email updates</h5>
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
          <h5 className="text-primary">Delete account</h5>
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
