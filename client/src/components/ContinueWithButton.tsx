import { useContext, useEffect } from 'react';
import ButtonWithSpinner from 'components/ButtonWithSpinner';
import { HistoryContext } from 'components/HistoryProvider';
import { useLoginWithGoogleMutation, useSignupWithGoogleMutation } from "slices/api";
import { createAndStoreSessionNonce } from 'utils/auth.utils';
import { capitalize } from 'utils/misc.utils';
import { logos, OAuth2Provider } from 'utils/oauth2-common';
import { getReqErrorMessage, useMutationWithPersistentError } from 'utils/requests.utils';
import styles from './ContinueWithButton.module.css';

export default function ContinueWithButton({
  reason,
  provider,
  useLoginMutation,
  useSignupMutation,
  className,
}: {
  reason: 'signup' | 'login',
  provider: OAuth2Provider,
  useLoginMutation: typeof useLoginWithGoogleMutation,
  useSignupMutation: typeof useSignupWithGoogleMutation,
  className?: string;
}) {
  const [
    login,
    {
      data: login_data,
      isSuccess: login_isSuccess,
      isLoading: login_isLoading,
      error: login_error
    }
  ] = useMutationWithPersistentError(useLoginMutation);
  const [
    signup,
    {
      data: signup_data,
      isSuccess: signup_isSuccess,
      isLoading: signup_isLoading,
      error: signup_error
    }
  ] = useMutationWithPersistentError(useSignupMutation);
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
  const capitalizedProvider = capitalize(provider);
  const logoPath = logos[provider];
  className = `btn ${styles.ContinueWithButton} border w-100` + (className ? ` ${className}` : '');
  return (
    <>
      <ButtonWithSpinner
        className={className}
        onClick={onClick}
        isLoading={btnDisabled}
      >
        <img
          src={logoPath}
          alt={`${capitalizedProvider} Logo`}
          className="me-3"
          style={{maxHeight: '1.2em', verticalAlign: 'middle'}}
        />
        <span style={{verticalAlign: 'middle'}}>
          Continue with {capitalizedProvider}
        </span>
      </ButtonWithSpinner>
      {error && (
        <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
      )}
    </>
  );
}
