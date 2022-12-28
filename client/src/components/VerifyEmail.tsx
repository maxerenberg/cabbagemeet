import { Link, useSearchParams } from "react-router-dom";
import { useVerifyEmailMutation } from "slices/api";
import { getReqErrorMessage } from "utils/requests.utils";
import useSetTitle from "utils/title.hook";
import useEffectOnce from "utils/useEffectOnce.hook";
import GenericSpinner from "./GenericSpinner";

export default function VerifyEmail() {
  const [verifyEmail, { isSuccess, error}] = useVerifyEmailMutation();
  const [searchParams] = useSearchParams();
  const encrypted_entity = searchParams.get('encrypted_entity');
  const iv = searchParams.get('iv');
  const salt = searchParams.get('salt');
  const tag = searchParams.get('tag');
  const urlIsValid = !!(encrypted_entity && iv && salt && tag);

  useSetTitle('Verify Email Address');

  useEffectOnce(() => {
    if (!urlIsValid) return;
    verifyEmail({
      encrypted_entity,
      iv,
      salt,
      tag,
    });
  }, [urlIsValid, verifyEmail]);

  if (!isSuccess && !urlIsValid) {
    return (
      <p>The URL is invalid.</p>
    );
  }

  if (error) {
    return (
      <p className="mt-3">
        An error occurred: {getReqErrorMessage(error)}
      </p>
    );
  }

  if (isSuccess) {
    return (
      <p>
        Your email address was successfully verified. You may now proceed
        to <Link to="/login">the login page</Link>.
      </p>
    )
  }

  return <GenericSpinner />;
}
