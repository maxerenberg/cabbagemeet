import { useEffect, useRef, useState } from "react";
import { Form } from "react-bootstrap";
import { useVerifyEmailMutation } from "slices/api";
import { getReqErrorMessage } from "utils/requests.utils";
import ButtonWithSpinner from "./ButtonWithSpinner";

export default function VerifyEmailAddress({
  name, email, password,
  redirectAfterSuccessfulSignup,
}: {
  name: string, email: string, password: string,
  redirectAfterSuccessfulSignup: () => void,
}) {
  const codeRef = useRef<HTMLInputElement>(null);
  const [validated, setValidated] = useState(false);
  const [verifyEmail, {isLoading, isSuccess, isError, error}] = useVerifyEmailMutation();

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    if (form.checkValidity()) {
      verifyEmail({
        name,
        email,
        password,
        code: codeRef.current!.value,
      });
    } else {
      setValidated(true);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      redirectAfterSuccessfulSignup();
    }
  }, [isSuccess, redirectAfterSuccessfulSignup]);

  return (
    <div className="align-self-center" style={{width: 'min(100%, 600px)'}}>
      <h3>Signup Confirmation</h3>
      <hr className="my-4" />
      <p>
        A 6-digit confirmation code was just sent to <strong>{email}</strong>.
        <br />
        If it has not arrived after a few minutes, please make sure to check your
        Junk folder.
      </p>
      <Form noValidate className="mt-5" {...{validated, onSubmit}}>
        <Form.Group controlId="verify-email-address-code" className="d-flex flex-wrap align-items-center">
          <Form.Label className="pt-2">Verification code:</Form.Label>
          <Form.Control
            required
            autoFocus
            autoComplete="off"
            className="ms-4"
            style={{width: 'unset'}}
            ref={codeRef}
            minLength={6}
            maxLength={6}
          />
          <Form.Control.Feedback type="invalid">
            Code must be 6 digits
          </Form.Control.Feedback>
        </Form.Group>
        <ButtonWithSpinner
          type="submit"
          className="d-block mt-5 btn btn-primary"
          isLoading={isLoading}
        >
          Submit
        </ButtonWithSpinner>
      </Form>
      {isError && (
        <p className="text-danger mt-3">
          Error: {getReqErrorMessage(error!)}
        </p>
      )}
    </div>
  );
}
