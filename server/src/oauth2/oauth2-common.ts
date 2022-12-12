// These need to be in a separate file to avoid a circular import
export const oidcScopes = ['openid', 'profile', 'email'] as const;
export enum OAuth2ProviderType {
  GOOGLE = 1,
  MICROSOFT,
}
// Need to remove strings because the TS compiler will also map the enum values
// to their names (basically a bidirectional map)
// See https://stackoverflow.com/a/39439520
export const oauth2ProviderTypes = Object.values(OAuth2ProviderType)
  .filter(val => typeof val !== 'string') as OAuth2ProviderType[];
export const oauth2ProviderNamesMap: Record<OAuth2ProviderType, string> = {
  [OAuth2ProviderType.GOOGLE]: 'Google',
  [OAuth2ProviderType.MICROSOFT]: 'Microsoft',
};
export const oauth2ProviderNames = Object.values(oauth2ProviderNamesMap);
export const oauth2TableNames = oauth2ProviderNames.map(name => `${name}OAuth2`);
export const oauth2Reasons = ['link', 'signup', 'login'] as const;
export const MAX_EVENT_RESULTS = 100;

export class OAuth2NotConfiguredError extends Error {}
export class OAuth2ErrorResponseError extends Error {
  constructor(
    public statusCode: number,
    public errorCode?: string,
  ) {
    super();
  }
}
// TODO: replace these with a single class and an enum argument
export class OAuth2InvalidStateError extends Error {}
export class OAuth2InvalidOrExpiredNonceError extends Error {}
export class OAuth2NoRefreshTokenError extends Error {}
export class OAuth2NotAllScopesGrantedError extends Error {}
export class OAuth2AccountAlreadyLinkedError extends Error {}
export class OAuth2AccountNotLinkedError extends Error {}

export type OAuth2CalendarEvent = {
  ID: string;
  summary: string;
  start: string;  // e.g. "2022-10-23T13:00:00Z"
  end: string;    // e.g. "2022-10-23T14:00:00Z"
};
