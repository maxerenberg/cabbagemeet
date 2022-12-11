import { useContext, useEffect } from 'react';
import { useLoginWithGoogleMutation, useSignupWithGoogleMutation } from "slices/api";
import { getReqErrorMessage, useMutationWithPersistentError } from 'utils/requests.utils';
import ButtonWithSpinner from './ButtonWithSpinner';
import { createAndStoreSessionNonce } from 'utils/auth.utils';
import { HistoryContext } from './HistoryProvider';

export default function ContinueWithButton({
  reason,
  providerName,
  useLoginMutation,
  useSignupMutation,
  logoPath,
  className,
}: {
  reason: 'signup' | 'login',
  providerName: string,
  useLoginMutation: typeof useLoginWithGoogleMutation,
  useSignupMutation: typeof useSignupWithGoogleMutation,
  logoPath: string,
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
  className = 'btn btn-light border w-100' + (className ? ` ${className}` : '');
  return (
    <>
      <ButtonWithSpinner
        className={className}
        onClick={onClick}
        isLoading={btnDisabled}
      >
        <img
          src={logoPath}
          alt={`${providerName} Logo`}
          className="me-3"
          style={{maxHeight: '1.2em', verticalAlign: 'middle'}}
        />
        <span style={{verticalAlign: 'middle'}}>
          Continue with {providerName}
        </span>
      </ButtonWithSpinner>
      {error && (
        <p className="text-danger text-center mb-0 mt-3">An error occurred: {getReqErrorMessage(error)}</p>
      )}
    </>
  );
}
