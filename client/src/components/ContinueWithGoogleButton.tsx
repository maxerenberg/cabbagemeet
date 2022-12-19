import { useLoginWithGoogleMutation, useSignupWithGoogleMutation } from 'slices/api';
import ContinueWithButton from './ContinueWithButton';

// TODO: get feature flags from server so that we don't display this button
// if Google OAuth2 isn't enabled

export default function ContinueWithGoogleButton({reason, className}: {reason: 'signup' | 'login', className?: string}) {
  return (
    <ContinueWithButton
      reason={reason}
      provider="google"
      useLoginMutation={useLoginWithGoogleMutation}
      useSignupMutation={useSignupWithGoogleMutation}
      className={className}
    />
  );
};
