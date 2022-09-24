import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from 'components/BottomOverlay';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import NonFocusButton from 'components/NonFocusButton';
import { useToast } from 'components/Toast';
import {
  resetPassword,
  selectResetPasswordError,
  selectResetPasswordState,
  setResetPasswordStateToIdle,
 } from 'slices/resetPassword';
 import styles from './ForgotPassword.module.css';

 export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [resetPasswordAtLeastOnce, setResetPasswordAtLeastOnce] = useState(false);
  const dispatch = useAppDispatch();

  // FIXME: this is ugly, figure out where/when to reset all of the Redux state
  useEffect(() => {
    dispatch(setResetPasswordStateToIdle());
  }, [dispatch]);

  return (
    <div className="d-flex justify-content-center">
      {
        resetPasswordAtLeastOnce
        ? <PasswordResetConfirmation email={email} />
        : <ForgotPasswordForm {...{email, setEmail, setResetPasswordAtLeastOnce}} />
      }
    </div>
  )
 };

function ForgotPasswordForm({
  email,
  setEmail,
  setResetPasswordAtLeastOnce,
} : {
  email: string,
  setEmail: (email: string) => void,
  setResetPasswordAtLeastOnce: (val: boolean) => void,
}) {
  const [validated, setValidated] = useState(false);
  const dispatch = useAppDispatch();
  const resetPasswordState = useAppSelector(selectResetPasswordState);
  const resetPasswordError = useAppSelector(selectResetPasswordError);
  const { showToast } = useToast();
  let onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  const canSendRequest = resetPasswordState === 'idle';
  const submitBtnDisabled = !canSendRequest;
  if (canSendRequest) {
    onSubmit = (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      if (form.checkValidity()) {
        dispatch(resetPassword({email}));
      } else {
        setValidated(true);
      }
    };
  }

  useEffect(() => {
    if (resetPasswordState === 'fulfilled') {
      setResetPasswordAtLeastOnce(true);
    } else if (resetPasswordState === 'rejected') {
      showToast({
        msg: `An error occurred: ${resetPasswordError!.message || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(setResetPasswordStateToIdle());
    }
  }, [resetPasswordState, setResetPasswordAtLeastOnce, resetPasswordError, dispatch, showToast]);

  return (
    <Form noValidate className={styles.forgotPasswordForm} {...{validated, onSubmit}}>
      <h4 className="mb-5">Forgot your password?</h4>
      <p>
        Enter the email associated with your account. If the account exists,
        you will be sent a link to reset your password.
      </p>
      <Form.Group controlId="forgotpassword-form-email" className="mt-5">
        <Form.Label>Email address</Form.Label>
        <Form.Control
          required
          placeholder="What's your email address?"
          type="email"
          className="form-text-input"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
        />
        <Form.Control.Feedback type="invalid">
          Please enter a valid email address.
        </Form.Control.Feedback>
      </Form.Group>
      <ResetButtons disabled={submitBtnDisabled} />
    </Form>
  );
}

function ResetButtons({ disabled } : { disabled: boolean }) {
  const spinner = disabled && <ButtonSpinnerRight />;
  return (
    <>
      <NonFocusButton
        className="d-none d-md-block btn btn-outline-primary px-3 mt-4"
        type="submit"
        disabled={disabled}
      >
        Reset
        {spinner}
      </NonFocusButton>
      <BottomOverlay>
        <NonFocusButton
          className="btn btn-light px-3 ms-auto"
          type="submit"
          disabled={disabled}
        >
          Reset
          {spinner}
        </NonFocusButton>
      </BottomOverlay>
    </>
  )
}

function PasswordResetConfirmation({ email }: { email: string }) {
  const dispatch = useAppDispatch();
  const resetPasswordState = useAppSelector(selectResetPasswordState);
  const resetPasswordError = useAppSelector(selectResetPasswordError);
  const { showToast } = useToast();
  const canSendRequest = resetPasswordState === 'idle' || resetPasswordState === 'fulfilled';
  const submitBtnDisabled = !canSendRequest;
  const [clickedResendAtLeastOnce, setClickedResendAtLeastOnce] = useState(false);
  let onClick: React.MouseEventHandler | undefined;
  if (canSendRequest) {
    onClick = () => {
      dispatch(resetPassword({email}));
      setClickedResendAtLeastOnce(true);
    };
  }

  useEffect(() => {
    if (!clickedResendAtLeastOnce) {
      return;
    }
    if (resetPasswordState === 'rejected') {
      showToast({
        msg: `An error occurred: ${resetPasswordError!.message || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(setResetPasswordStateToIdle());
    } else if (resetPasswordState === 'fulfilled') {
      showToast({
        msg: 'Request successfully submitted',
        msgType: 'success',
        autoClose: true,
      });
    }
  }, [clickedResendAtLeastOnce, resetPasswordState, resetPasswordError, dispatch, showToast]);

  return (
    <div className={styles.passwordResetConfirmation}>
      <h4 className="mb-5">Email sent!</h4>
      <p>
        If the account exists, you'll receive an email with a link to
        reset your password. If more than 5 minutes have passed and you
        still haven't received it, press the Resend button below to receive
        a new email.
      </p>
      <ResendButtons disabled={submitBtnDisabled} onClick={onClick} />
    </div>
  );
}

function ResendButtons({
  disabled,
  onClick,
} : {
  disabled: boolean,
  onClick: React.MouseEventHandler | undefined,
}) {
  const spinner = disabled && <ButtonSpinnerRight />;
  return (
    <>
      <NonFocusButton
        className="d-none d-md-block btn btn-outline-primary px-3 mt-4"
        disabled={disabled}
        onClick={onClick}
      >
        Resend
        {spinner}
      </NonFocusButton>
      <BottomOverlay>
        <NonFocusButton
          className="btn btn-light px-3 ms-auto"
          disabled={disabled}
          onClick={onClick}
        >
          Resend
          {spinner}
        </NonFocusButton>
      </BottomOverlay>
    </>
  )
}
