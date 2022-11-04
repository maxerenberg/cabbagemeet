import React, { useEffect, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from 'components/BottomOverlay';
import ContinueWithGoogleButton from 'components/ContinueWithGoogleButton';
import { useToast } from 'components/Toast';
import ButtonSpinnerRight from 'components/ButtonSpinnerRight';
import styles from './Signup.module.css';
import {
  selectSignupError,
  selectSignupState,
  setAuthRequestToIdle,
  submitSignupForm,
 } from 'slices/authentication';

export default function Signup() {
  return (
    <div className={styles.signupContainer}>
      <SignupForm />
      <WhyShouldISignUp />
    </div>
  );
};

function SignupForm() {
  const [validated, setValidated] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const signupState = useAppSelector(selectSignupState);
  const signupError = useAppSelector(selectSignupError);
  const { showToast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  let onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  const submitBtnDisabled = signupState !== 'idle';
  if (signupState === 'idle') {
    onSubmit = (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      if (form.checkValidity()) {
        dispatch(submitSignupForm({
          name: nameRef.current!.value,
          email: emailRef.current!.value,
          password: passwordRef.current!.value,
        }));
      } else {
        setValidated(true);
      }
    };
  }

  useEffect(() => {
    if (signupState === 'failed') {
      showToast({
        msg: `An error occurred: ${signupError!.message || 'unknown'}`,
        msgType: 'failure',
      });
      dispatch(setAuthRequestToIdle());
    } else if (signupState === 'succeeded') {
      //dispatch(setAuthRequestToIdle());
      navigate('/');
    }
  }, [signupState, signupError, dispatch, navigate, showToast]);

  return (
    <Form noValidate className={styles.signupForm} {...{validated, onSubmit}}>
      <h4 className="mb-5">Sign up</h4>
      <ContinueWithGoogleButton />
      <div className="d-flex align-items-center my-4">
        <div className="border-top flex-grow-1"></div>
        <span className="fw-bold mx-2">OR</span>
        <div className="border-top flex-grow-1"></div>
      </div>
      <Form.Group controlId="signup-form-name">
        <Form.Label>Name</Form.Label>
        <Form.Control
          required
          placeholder="What's your name?"
          className="form-text-input"
          ref={nameRef}
        />
        <Form.Control.Feedback type="invalid">Please enter a name.</Form.Control.Feedback>
      </Form.Group>
      <Form.Group controlId="signup-form-email" className="mt-5">
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
      <Form.Group controlId="signup-form-password" className="mt-5">
        <Form.Label>Password</Form.Label>
        <Form.Control
          required
          minLength={6}
          maxLength={30}
          placeholder="What would you like your password to be?"
          type="password"
          className="form-text-input"
          ref={passwordRef}
        />
        <Form.Control.Feedback type="invalid">
          Password must be between 6-30 characters.
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
        <Link to="/login" className={`custom-link ${styles.alreadyHaveAccountLink}`}>
          Already have an account?
        </Link>
        <button type="submit" className="btn btn-outline-primary px-3" disabled={disabled}>
          Sign up
          {spinner}
        </button>
      </div>
      <BottomOverlay>
        <Link to="/login" className={`custom-link custom-link-inverted ${styles.alreadyHaveAccountLink}`}>
          Already have an account?
        </Link>
        <button type="submit" className="btn btn-light ms-auto px-3" disabled={disabled}>
          Sign up
          {spinner}
        </button>
      </BottomOverlay>
    </>
  );
}

function WhyShouldISignUp() {
  return (
    <div className={styles.whyShouldISignUp}>
      <h4 className="mb-5">Why should I sign up?</h4>
      <div>
        <div className="text-primary">1&#41; Google calendar integration</div>
        <p className="mt-2">
          Check for conflicts with your Google calendar events when filling
          out your availabilities.
        </p>
      </div>
      <div className="mt-5">
        <div className="text-primary">2&#41; All your meetings in one profile</div>
        <p className="mt-2">
          See all of the meetings which you've created or replied to from
          your profile. Your can also update your meeting info after
          creating it.
        </p>
      </div>
      <div className="mt-5">
        <div className="text-primary">3&#41; Notifications</div>
        <p className="mt-2">
          Get notified when someone responds to a meeting which you've created.
        </p>
      </div>
    </div>
  )
}
