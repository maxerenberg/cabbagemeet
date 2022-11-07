import { useSearchParams } from "react-router-dom";

type ErrorCode =
    'E_GOOGLE_OAUTH2_NOT_AVAILABLE'
  | 'E_GOOGLE_ACCOUNT_ALREADY_LINKED'
  | 'E_NOT_ALL_OAUTH2_SCOPES_GRANTED'
  | 'E_INTERNAL_SERVER_ERROR';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // TODO: use hyperlink on "you must login" text
  E_GOOGLE_ACCOUNT_ALREADY_LINKED: (
    'This Google account is already linked. You must login using this Google '
    + 'account to unlink it.'
  ),
  E_GOOGLE_OAUTH2_NOT_AVAILABLE: 'Google OAuth2 has not been configured on this server.',
  E_NOT_ALL_OAUTH2_SCOPES_GRANTED: 'Not all required OAuth2 scopes were granted.',
  E_INTERNAL_SERVER_ERROR: 'Internal server error. :((((((((((',
};

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('e');
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode as ErrorCode]
    : null;
  return (
    <>
      <p>An error occurred{errorMessage ? ':' : '.'}</p>
      {errorMessage && (
        <p>{errorMessage}</p>
      )}
    </>
  );
}
