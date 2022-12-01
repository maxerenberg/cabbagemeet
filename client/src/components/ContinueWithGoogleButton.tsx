import { useContext, useEffect } from 'react';
import GoogleLogo from 'assets/google-g-logo.svg';
import { useLoginWithGoogleMutation, useSignupWithGoogleMutation } from 'slices/api';
import { getReqErrorMessage, useMutationWithPersistentError } from 'utils/requests.utils';
import ButtonWithSpinner from './ButtonWithSpinner';
import { createAndStoreSessionNonce } from 'utils/auth.utils';
import { HistoryContext } from './HistoryProvider';

// TODO: get feature flags from server so that we don't display this button
// if Google OAuth2 isn't enabled

export default function ContinueWithGoogleButton({reason}: {reason: 'signup' | 'login'}) {
  const [
    login,
    {
      data: login_data,
      isSuccess: login_isSuccess,
      isLoading: login_isLoading,
      error: login_error
    }
  ] = useMutationWithPersistentError(useLoginWithGoogleMutation);
  const [
    signup,
    {
      data: signup_data,
      isSuccess: signup_isSuccess,
      isLoading: signup_isLoading,
      error: signup_error
    }
  ] = useMutationWithPersistentError(useSignupWithGoogleMutation);
  const {lastNonAuthPath} = useContext(HistoryContext);
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  if (reason === 'login') {
    onClick = async () => {
      login({
        post_redirect: lastNonAuthPath,
        nonce: await createAndStoreSessionNonce(),
      });
    };
  } else if (reason === 'signup') {
    onClick = async () => {
      signup({
        post_redirect: lastNonAuthPath,
        nonce: await createAndStoreSessionNonce(),
      });
    };
  }
  useEffect(() => {
    if (login_isSuccess) {
      window.location.href = login_data!.redirect;
    }
  }, [login_isSuccess, login_data]);
  useEffect(() => {
    if (signup_isSuccess) {
      window.location.href = signup_data!.redirect;
    }
  }, [signup_isSuccess, signup_data]);
  const isLoading = login_isLoading || signup_isLoading;
  const isSuccess = login_isSuccess || signup_isSuccess;
  const error = login_error || signup_error;
  const btnDisabled = isLoading || isSuccess;
  return (
    <>
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
      {error && (
        <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
      )}
    </>
  );
};
