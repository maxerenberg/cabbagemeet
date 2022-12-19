import { ServerInfoResponse, useGetServerInfoQuery } from "slices/api";
import { OAuth2Provider } from "utils/oauth2-common";
import ContinueWithGoogleButton from "./ContinueWithGoogleButton";
import ContinueWithMicrosoftButton from "./ContinueWithMicrosoftButton";

const buttonComponents: Record<OAuth2Provider, typeof ContinueWithGoogleButton> = {
  'google': ContinueWithGoogleButton,
  'microsoft': ContinueWithMicrosoftButton,
};

export default function OAuth2ProviderButtons({reason}: {reason: 'signup' | 'login'}) {
  const {data} = useGetServerInfoQuery();
  if (data === undefined) {
    return null;
  }
  const buttons = Object.entries(buttonComponents)
    .filter(([provider]) => data[(provider + 'OAuth2IsSupported') as keyof ServerInfoResponse])
    .map(([_, component]) => component);
  if (buttons.length === 0) {
    return null;
  }
  return (
    <>
      {buttons.map((ProviderButton, i) => (
        <ProviderButton key={i} reason={reason} className={i === 0 ? undefined : 'mt-4'} />
      ))}
      <ORBar />
    </>
  );
}

function ORBar() {
  return (
    <div className="d-flex align-items-center my-4">
      <div className="border-top flex-grow-1"></div>
      <span className="fw-bold mx-2">OR</span>
      <div className="border-top flex-grow-1"></div>
    </div>
  );
}
