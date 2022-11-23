import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import ButtonWithSpinner from "components/ButtonWithSpinner";
import { useConfirmPasswordResetMutation } from "slices/enhancedApi";
import { useToast } from "./Toast";
import { getReqErrorMessage } from "utils/requests.utils";
import { Link } from "react-router-dom";

export default function ConfirmPasswordReset() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [validated, setValidated] = useState(false);
  const [confirmReset, {isLoading, isSuccess, isError, error}] = useConfirmPasswordResetMutation();
  const {showToast} = useToast();
  const token = searchParams.get('pwresetToken');

  useEffect(() => {
    if (isError) {
      showToast({
        msg: getReqErrorMessage(error!),
        msgType: 'failure',
      });
    }
  }, [isError, error, showToast]);

  if (!token) {
    return (
      <p>The URL is not valid.</p>
    );
  }

  if (isSuccess) {
    return (
      <p>
        Your password was successfully reset. You may now proceed
        to <Link to="/login">the login page</Link>.
      </p>
    )
  }

  const passwordIsValid = password.length >= 6 && password.length <= 30;
  const passwordConfirmationIsValid = password === passwordConfirmation;

  let onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  const btnDisabled = isLoading;
  if (!btnDisabled) {
    onSubmit = (ev) => {
      ev.preventDefault();
      if (passwordIsValid && passwordConfirmationIsValid) {
        confirmReset({token, password});
      } else {
        setValidated(true);
      }
    };
  }
  return (
    <div className="align-self-center" style={{width: 'min(100%, 600px)'}}>
      <h3>Password Reset Confirmation</h3>
      <hr className="my-4" />
      {/*
        We don't pass `validated` to the <Form> because we need a custom validator
        on one of the controls.
        See https://github.com/react-bootstrap/react-bootstrap/issues/5190.
      */}
      <Form noValidate onSubmit={onSubmit}>
        <Form.Group controlId="confirm-password-reset-password">
          <Form.Label>New password:</Form.Label>
          <Form.Control
            required
            isValid={validated && passwordIsValid}
            isInvalid={validated && !passwordIsValid}
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            Password must be between 6-30 characters.
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="confirm-password-reset-confirm-password" className="mt-4">
          <Form.Label>Confirm new password:</Form.Label>
          <Form.Control
            required
            isValid={validated && passwordConfirmationIsValid}
            isInvalid={validated && !passwordConfirmationIsValid}
            type="password"
            value={passwordConfirmation}
            onChange={(ev) => setPasswordConfirmation(ev.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            Does not match password
          </Form.Control.Feedback>
        </Form.Group>
        <ButtonWithSpinner
          type="submit"
          className="d-block mt-5 btn btn-primary"
          isLoading={isLoading}
          disabled={btnDisabled}
        >
          Submit
        </ButtonWithSpinner>
      </Form>
    </div>
  );
}
