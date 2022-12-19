import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAppSelector } from 'app/hooks';
import ButtonWithSpinner from 'components/ButtonWithSpinner';
import GenericSpinner from 'components/GenericSpinner';
import { useToast } from 'components/Toast';
import {
  useConfirmLinkGoogleAccountMutation,
  useConfirmLinkMicrosoftAccountMutation,
} from 'slices/api';
import { selectTokenIsPresent } from 'slices/authentication';
import { useGetSelfInfoIfTokenIsPresent } from 'utils/auth.hooks';
import { capitalize } from 'utils/misc.utils';
import { calendarProductNames, logos, OAuth2Provider } from 'utils/oauth2-common';
import { getReqErrorMessage } from 'utils/requests.utils';

const confirmLinkAccountHooks: Record<OAuth2Provider, typeof useConfirmLinkGoogleAccountMutation> = {
  'google': useConfirmLinkGoogleAccountMutation,
  'microsoft': useConfirmLinkMicrosoftAccountMutation,
};

export default function ConfirmLinkExternalCalendar({provider}: {provider: OAuth2Provider}) {
  const capitalizedProvider = capitalize(provider);
  const tokenIsPresent = useAppSelector(selectTokenIsPresent);
  const {data: userInfo} = useGetSelfInfoIfTokenIsPresent();
  const navigate = useNavigate();
  const [confirmLinkAccount, {isSuccess, isLoading, error}] = confirmLinkAccountHooks[provider]();
  const {showToast} = useToast();
  const [searchParams] = useSearchParams();
  // The token will be removed from the URL and stored in the Redux store from
  // another hook
  const token = searchParams.get('token');
  const postRedirect = searchParams.get('postRedirect');
  const encryptedEntity = searchParams.get('encryptedEntity');
  const iv = searchParams.get('iv');
  const salt = searchParams.get('salt');
  const tag = searchParams.get('tag');
  const requiredParamsArePresent = !!(postRedirect && encryptedEntity && iv && salt && tag);
  const shouldRedirectToHomePage = !requiredParamsArePresent || (!tokenIsPresent && !token)
  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: `Successfully linked ${capitalizedProvider} account`,
        msgType: 'success',
        autoClose: true,
      });
      navigate(postRedirect!);
    }
  }, [isSuccess, capitalizedProvider, showToast, navigate, postRedirect]);
  useEffect(() => {
    if (shouldRedirectToHomePage) {
      navigate('/');
    }
  }, [shouldRedirectToHomePage, navigate]);
  if (shouldRedirectToHomePage) {
    return null;
  }
  if (!userInfo) {
    return <GenericSpinner />;
  }
  const calendarBrandName = calendarProductNames[provider] ?? capitalizedProvider;
  const onClick = () => confirmLinkAccount({
    encrypted_entity: encryptedEntity,
    iv,
    salt,
    tag,
  });
  const btnDisabled = isLoading;
  return (
    <div className="align-self-center" style={{width: 'min(100%, 600px)'}}>
      <div className="d-flex align-items-center justify-content-between">
        <h3 className="mb-0">
          Link your {capitalizedProvider} account
        </h3>
        <img
          src={logos[provider]}
          alt={`${capitalizedProvider} Logo`}
          style={{maxHeight: '1.5em'}}
        />
      </div>
      <hr className="my-4" />
      <p>Welcome back, {userInfo.name}!</p>
      <p>
        You already have an account on CabbageMeet associated with
        the email address <strong>{userInfo.email}</strong>.
        Link your {capitalizedProvider} account to obtain the following benefits:
      </p>
      <ul>
        <li>Single sign-on with {capitalizedProvider}</li>
        <li>See your {calendarBrandName} calendar events when adding your availabilities</li>
        <li>Synchronize your scheduled meetings with {calendarBrandName} calendar</li>
      </ul>
      {error && (
        <p className="text-danger text-center mb-0 mt-4">An error occurred: {getReqErrorMessage(error)}</p>
      )}
      <div className="mt-5 d-flex justify-content-between">
        <Link to={postRedirect}>
          <button
            type="button"
            className="btn btn-outline-secondary px-4"
            disabled={btnDisabled}
          >
            Cancel
          </button>
        </Link>
        <ButtonWithSpinner
          className="btn btn-outline-primary"
          onClick={onClick}
          isLoading={btnDisabled}
        >
          Link {capitalizedProvider} account
        </ButtonWithSpinner>
      </div>
    </div>
  );
}
