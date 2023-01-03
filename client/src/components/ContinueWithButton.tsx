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
    loginOrSignup,
    {
      data,
      isSuccess,
      isLoading,
      error,
      reset,
    }
  ] = useMutationWithPersistentError(
    reason === 'signup' ? useSignupMutation : useLoginMutation
  );
  const {lastNonAuthPath} = useContext(HistoryContext);
  let onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  onClick = async () => {
    loginOrSignup({
      post_redirect: lastNonAuthPath,
      nonce: await createAndStoreSessionNonce(),
    });
  };
  useEffect(() => {
    if (isSuccess) {
      window.location.href = data!.redirect;
    }
  }, [isSuccess, data]);
  // We need to reset the request status so that the spinner isn't still
  // visible when the user presses the back button from the OAuth2 consent
  // page (this only happens in the production build).
  // But we still want the spinner to be visible while the URL is changing,
  // which is why we can't just call reset() after setting location.href.
  useEffect(() => {
    const listener = () => {
      reset();
    };
    window.addEventListener('pageshow', listener);
    return () => {
      window.removeEventListener('pageshow', listener);
    };
  }, [reset]);
  const capitalizedProvider = capitalize(provider);
  const logoPath = logos[provider];
  className = `btn ${styles.ContinueWithButton} border w-100` + (className ? ` ${className}` : '');
  return (
    <>
      <ButtonWithSpinner
        className={className}
        onClick={onClick}
        isLoading={isLoading || isSuccess}
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
