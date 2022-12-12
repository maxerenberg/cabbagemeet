import GoogleLogo from 'assets/google-g-logo.svg';
import MicrosoftLogo from 'assets/microsoft-logo.svg';
import {
  useConfirmLinkGoogleAccountMutation,
  useConfirmLinkMicrosoftAccountMutation,
} from 'slices/api';

export type OAuth2Provider = 'google' | 'microsoft';
export const logos: Record<OAuth2Provider, string> = {
  'google': GoogleLogo,
  'microsoft': MicrosoftLogo,
};
export const calendarBrandNames: Partial<Record<OAuth2Provider, string>> = {
  'microsoft': 'Outlook',
};
export const confirmLinkAccountHooks: Record<OAuth2Provider, typeof useConfirmLinkGoogleAccountMutation> = {
  'google': useConfirmLinkGoogleAccountMutation,
  'microsoft': useConfirmLinkMicrosoftAccountMutation,
};
