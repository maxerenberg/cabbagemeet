export const oauth2Providers = ['google', 'microsoft'] as const;
export type OAuth2Provider = typeof oauth2Providers[number];
// Make sure to create <link rel="prefetch"> tags for these in index.html
export const logos: Record<OAuth2Provider, string> = {
  'google': process.env.PUBLIC_URL + '/google-logo.svg',
  'microsoft': process.env.PUBLIC_URL + '/microsoft-logo.svg',
};
export const calendarProductNames: Partial<Record<OAuth2Provider, string>> = {
  'microsoft': 'Outlook',
};
