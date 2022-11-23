import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import BottomOverlay from 'components/BottomOverlay';
import { useToast } from 'components/Toast';
import styles from './ForgotPassword.module.css';
import ButtonWithSpinner from './ButtonWithSpinner';
import { useResetPasswordMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';

 export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [resetPasswordAtLeastOnce, setResetPasswordAtLeastOnce] = useState(false);

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

  const { showToast } = useToast();
  const [resetPassword, {isUninitialized, isSuccess, isError, error}] = useResetPasswordMutation();
  const canSendRequest = isUninitialized;
  const submitBtnDisabled = !canSendRequest;
  let onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  if (canSendRequest) {
    onSubmit = (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      if (form.checkValidity()) {
        resetPassword({email});
      } else {
        setValidated(true);
      }
    };
  }

  useEffect(() => {
    if (isSuccess) {
      setResetPasswordAtLeastOnce(true);
    } else if (isError) {
      showToast({
        msg: `An error occurred: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    }
  }, [isSuccess, isError, error, setResetPasswordAtLeastOnce, showToast]);

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
  return (
    <>
      <ButtonWithSpinner
        as="NonFocusButton"
        className="d-none d-md-block btn btn-outline-primary mt-4"
        type="submit"
        isLoading={disabled}
      >
        Reset
      </ButtonWithSpinner>
      <BottomOverlay>
        <ButtonWithSpinner
          as="NonFocusButton"
          className="btn btn-light ms-auto"
          type="submit"
          isLoading={disabled}
        >
          Reset
        </ButtonWithSpinner>
      </BottomOverlay>
    </>
  )
}

function PasswordResetConfirmation({
  email,
}: {
  email: string,
}) {
  const { showToast } = useToast();
  const [resetPassword, {isUninitialized, isSuccess, isError, error}] = useResetPasswordMutation();
  const canSendRequest = isUninitialized || isSuccess;
  const submitBtnDisabled = !canSendRequest;
  const [clickedResendAtLeastOnce, setClickedResendAtLeastOnce] = useState(false);
  let onClick: React.MouseEventHandler | undefined;
  if (canSendRequest) {
    onClick = () => {
      resetPassword({email});
      setClickedResendAtLeastOnce(true);
    };
  }

  useEffect(() => {
    if (!clickedResendAtLeastOnce) {
      return;
    }
    if (isError) {
      showToast({
        msg: `An error occurred: ${getReqErrorMessage(error!)}`,
        msgType: 'failure',
      });
    } else if (isSuccess) {
      showToast({
        msg: 'Request successfully submitted',
        msgType: 'success',
        autoClose: true,
      });
    }
  }, [clickedResendAtLeastOnce, isSuccess, isError, error, showToast]);

  return (
    <div className={styles.passwordResetConfirmation}>
      <h4 className="mb-5">Email sent!</h4>
      <p>
        If the account exists, you'll receive an email with a link to
        reset your password. If more than 10 minutes have passed and you
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
  return (
    <>
      <ButtonWithSpinner
        as="NonFocusButton"
        className="d-none d-md-block btn btn-outline-primary mt-4"
        isLoading={disabled}
        onClick={onClick}
      >
        Resend
      </ButtonWithSpinner>
      <BottomOverlay>
        <ButtonWithSpinner
          as="NonFocusButton"
          className="btn btn-light ms-auto"
          isLoading={disabled}
          onClick={onClick}
        >
          Resend
        </ButtonWithSpinner>
      </BottomOverlay>
    </>
  )
}
