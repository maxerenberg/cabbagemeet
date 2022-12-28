import { useSearchParams } from "react-router-dom";
import { capitalize } from 'utils/misc.utils';
import useSetTitle from "utils/title.hook";

function getOAuth2ErrorMessage(e: string, provider: string | null): string {
  provider = provider ?? 'Unknown';
  provider = capitalize(provider);
  if (e === 'E_OAUTH2_ACCOUNT_ALREADY_LINKED') {
    return (
      `This ${provider} account is already linked to another local account. ` +
      `You must login using this ${provider} account to unlink it.`
    );
  } else if (e === 'E_OAUTH2_NOT_AVAILABLE') {
    return `${provider} OAuth2 has not been configured on this server.`;
  } else if (e === 'E_OAUTH2_NOT_ALL_SCOPES_GRANTED') {
    return 'Not all required OAuth2 scopes were granted.';
  }
  return 'Unknown OAuth2 error.';
}

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('e');
  const errorMessage = errorCode === null
    ? null
    : errorCode.startsWith('E_OAUTH2')
    ? getOAuth2ErrorMessage(errorCode, searchParams.get('provider'))
    : 'Internal server error. :((((((((((';

  useSetTitle('Error');

  return (
    <>
      <p>An error occurred{errorMessage ? ':' : '.'}</p>
      {errorMessage && (
        <p>{errorMessage}</p>
      )}
    </>
  );
}
