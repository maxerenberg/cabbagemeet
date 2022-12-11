import React, { useContext, useEffect, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Link, useNavigate } from 'react-router-dom';
import BottomOverlay from 'components/BottomOverlay';
import ContinueWithGoogleButton from 'components/ContinueWithGoogleButton';
import styles from './Login.module.css';
import { getReqErrorMessage, useMutationWithPersistentError } from "utils/requests.utils";
import ButtonWithSpinner from './ButtonWithSpinner';
import { useLoginMutation } from 'slices/api';
import { HistoryContext } from './HistoryProvider';
import ContinueWithMicrosoftButton from './ContinueWithMicrosoftButton';

// TODO: reduce code duplication with Signup.tsx

export default function Login() {
  return (
    <div className="d-flex justify-content-center">
      <LoginForm />
    </div>
  );
};

function ORBar() {
  return (
    <div className="d-flex align-items-center my-4">
      <div className="border-top flex-grow-1"></div>
      <span className="fw-bold mx-2">OR</span>
      <div className="border-top flex-grow-1"></div>
    </div>
  );
}

function LoginForm() {
  const [validated, setValidated] = useState(false);
  const navigate = useNavigate();
  const [login, {isUninitialized, isLoading, isSuccess, isError, error}] = useMutationWithPersistentError(useLoginMutation);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const {lastNonAuthPath} = useContext(HistoryContext);
  // Ref is used to avoid triggering a useEffect hook twice
  const lastNonAuthPathRef = useRef('/');
  let onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  const submitBtnDisabled = isLoading;
  if (isUninitialized || isError) {
    onSubmit = (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      if (form.checkValidity()) {
        login({
          email: emailRef.current!.value,
          password: passwordRef.current!.value,
        });
      } else {
        setValidated(true);
      }
    };
  }

  useEffect(() => { lastNonAuthPathRef.current = lastNonAuthPath; }, [lastNonAuthPath]);

  useEffect(() => {
    if (isSuccess) {
      navigate(lastNonAuthPathRef.current);
    }
  }, [isSuccess, navigate]);

  return (
    <Form noValidate className={styles.loginForm} {...{validated, onSubmit}}>
      <h4 className="mb-5">Login</h4>
      <ContinueWithGoogleButton reason='login' />
      <ContinueWithMicrosoftButton reason='login' className="mt-4" />
      <ORBar />
      <Form.Group controlId="login-form-email">
        <Form.Label>Email address</Form.Label>
        <Form.Control
          required
          placeholder="What's your email address?"
          type="email"
          className="form-text-input"
          ref={emailRef}
        />
        <Form.Control.Feedback type="invalid">
          Please enter a valid email address.
        </Form.Control.Feedback>
      </Form.Group>
      <Form.Group controlId="login-form-password" className="mt-5">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <Form.Label className="mb-0">Password</Form.Label>
          <Link to="/forgot-password" className={`custom-link ${styles.forgotPasswordLink}`} tabIndex={-1}>
            Forgot your password?
          </Link>
        </div>
        <Form.Control
          required
          placeholder="What's your password?"
          type="password"
          className="form-text-input"
          ref={passwordRef}
        />
        <Form.Control.Feedback type="invalid">
          Please enter your password.
        </Form.Control.Feedback>
      </Form.Group>
      {error && (
        <p className="text-danger text-center mb-0 mt-3">
          An error occurred: {getReqErrorMessage(error)}
        </p>
      )}
      <SignUpOrLogin disabled={submitBtnDisabled} />
    </Form>
  );
}

function SignUpOrLogin({ disabled } : { disabled: boolean }) {
  return (
    <>
      <div className="d-none d-md-flex align-items-center justify-content-between mt-5">
        <Link to="/signup" className={`custom-link ${styles.dontHaveAccountLink}`}>
          Don't have an account yet?
        </Link>
        <ButtonWithSpinner
          type="submit"
          className="btn btn-outline-primary"
          isLoading={disabled}
        >
          Log in
        </ButtonWithSpinner>
      </div>
      <BottomOverlay>
        <Link to="/signup" className={`custom-link custom-link-inverted ${styles.dontHaveAccountLink}`}>
        Don't have an account yet?
        </Link>
        <ButtonWithSpinner
          type="submit"
          className="btn btn-light ms-auto"
          isLoading={disabled}
        >
          Log in
        </ButtonWithSpinner>
      </BottomOverlay>
    </>
  );
}
