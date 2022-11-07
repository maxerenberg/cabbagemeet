import { useEffect } from 'react';
import GoogleLogo from 'assets/google-g-logo.svg';
import { useLoginWithGoogleMutation, useSignupWithGoogleMutation } from 'slices/api';
import { useToast } from 'components/Toast';
import { getReqErrorMessage } from 'utils/requests.utils';
import ButtonWithSpinner from './ButtonWithSpinner';

// TODO: get feature flags from server so that we don't display this button
// if Google OAuth2 isn't enabled

export default function ContinueWithGoogleButton({reason}: {reason: 'signup' | 'login'}) {
  const [
    login,
    {
      data: login_data,
      isSuccess: login_isSuccess,
      isLoading: login_isLoading,
      isError: login_isError,
      error: login_error
    }
  ] = useLoginWithGoogleMutation();
  const [
    signup,
    {
      data: signup_data,
      isSuccess: signup_isSuccess,
      isLoading: signup_isLoading,
      isError: signup_isError,
      error: signup_error
    }
  ] = useSignupWithGoogleMutation();
  const {showToast} = useToast();
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  if (reason === 'login') {
    onClick = () => login();
  } else if (reason === 'signup') {
    onClick = () => signup();
  }
  useEffect(() => {
    if (login_isSuccess) {
      window.location.href = login_data!.redirect;
    } else if (login_isError) {
      showToast({
        msg: `Could not login with Google: ${getReqErrorMessage(login_error!)}`,
        msgType: 'failure',
        autoClose: true,
      });
    }
  }, [login_isSuccess, login_data, login_isError, login_error, showToast]);
  useEffect(() => {
    if (signup_isSuccess) {
      window.location.href = signup_data!.redirect;
    } else if (signup_isError) {
      showToast({
        msg: `Could not sign up with Google: ${getReqErrorMessage(signup_error!)}`,
        msgType: 'failure',
        autoClose: true,
      });
    }
  }, [signup_isSuccess, signup_data, signup_isError, signup_error, showToast]);
  const btnDisabled = login_isLoading || login_isSuccess || signup_isLoading || signup_isSuccess;
  return (
    <ButtonWithSpinner
      className="btn btn-light border w-100"
      onClick={onClick}
      isLoading={btnDisabled}
    >
      <img
        src={GoogleLogo}
        alt="Google Logo"
        className="me-3"
        style={{maxHeight: '1.2em', verticalAlign: 'middle'}}
      />
      <span style={{verticalAlign: 'middle'}}>
        Continue with Google
      </span>
    </ButtonWithSpinner>
  );
};
