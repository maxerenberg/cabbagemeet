import React, { useEffect, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from 'components/BottomOverlay';
import ContinueWithGoogleButton from 'components/ContinueWithGoogleButton';
import { useToast } from 'components/Toast';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import {
  selectLoginError,
  selectLoginState,
  setAuthRequestToIdle,
  submitLoginForm,
 } from 'slices/authentication';
 import styles from './Login.module.css';

// TODO: reduce code duplication with Signup.tsx

export default function Login() {
  return (
    <div className="d-flex justify-content-center">
      <LoginForm />
    </div>
  );
};

function LoginForm() {
  const [validated, setValidated] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loginState = useAppSelector(selectLoginState);
  const loginError = useAppSelector(selectLoginError);
  const { showToast } = useToast();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  let onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  const submitBtnDisabled = loginState !== 'idle';
  if (loginState === 'idle') {
    onSubmit = (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      if (form.checkValidity()) {
        dispatch(submitLoginForm({
          email: emailRef.current!.value,
          password: passwordRef.current!.value,
        }));
      } else {
        setValidated(true);
      }
    };
  }

  useEffect(() => {
    if (loginState === 'rejected') {
      showToast({
        msg: `An error occurred: ${loginError!.message || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(setAuthRequestToIdle());
    } else if (loginState === 'fulfilled') {
      dispatch(setAuthRequestToIdle());
      navigate('/');
    }
  }, [loginState, loginError, dispatch, navigate, showToast]);

  return (
    <Form noValidate className={styles.loginForm} {...{validated, onSubmit}}>
      <h4 className="mb-5">Login</h4>
      <ContinueWithGoogleButton />
      <div className="d-flex align-items-center my-4">
        <div className="border-top flex-grow-1"></div>
        <span className="fw-bold mx-2">OR</span>
        <div className="border-top flex-grow-1"></div>
      </div>
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
      <SignUpOrLogin disabled={submitBtnDisabled} />
    </Form>
  );
}

function SignUpOrLogin({ disabled } : { disabled: boolean }) {
  const spinner = disabled && <ButtonSpinnerRight />;
  return (
    <>
      <div className="d-none d-md-flex align-items-center justify-content-between mt-5">
        <Link to="/signup" className={`custom-link ${styles.dontHaveAccountLink}`}>
          Don't have an account yet?
        </Link>
        <button type="submit" className="btn btn-outline-primary px-3" disabled={disabled}>
          Log in
          {spinner}
        </button>
      </div>
      <BottomOverlay>
        <Link to="/signup" className={`custom-link custom-link-inverted ${styles.dontHaveAccountLink}`}>
        Don't have an account yet?
        </Link>
        <button type="submit" className="btn btn-light ms-auto px-3" disabled={disabled}>
          Log in
          {spinner}
        </button>
      </BottomOverlay>
    </>
  );
}
