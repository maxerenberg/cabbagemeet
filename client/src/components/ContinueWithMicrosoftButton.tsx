import { useLoginWithMicrosoftMutation, useSignupWithMicrosoftMutation } from 'slices/api';
import ContinueWithButton from './ContinueWithButton';

// TODO: get feature flags from server so that we don't display this button
// if Microsoft OAuth2 isn't enabled

export default function ContinueWithMicrosoftButton({reason, className}: {reason: 'signup' | 'login', className?: string}) {
  return (
    <ContinueWithButton
      reason={reason}
      provider="microsoft"
      useLoginMutation={useLoginWithMicrosoftMutation}
      useSignupMutation={useSignupWithMicrosoftMutation}
      className={className}
    />
  );
};
