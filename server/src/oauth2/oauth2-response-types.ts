// See https://developers.google.com/identity/openid-connect/openid-connect#exchangecode
export interface GoogleOIDCResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

// See https://developers.google.com/identity/protocols/oauth2/web-server#offline
// The id_token wasn't in the sample response in the docs, but it is there if the
// 'oidc' scope was requested
export interface GoogleRefreshTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
}

// See:
// https://developers.google.com/identity/openid-connect/openid-connect#an-id-tokens-payload
// https://www.rfc-editor.org/rfc/rfc7519#section-4.1
export interface GoogleDecodedOIDCIDToken {
  // claims in which we are not interested have been omitted
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  name?: string;
  nonce?: string;
}

// Determined empirically :')
export interface GoogleOAuth2ErrorResponse {
  error: {
    code: number;  // e.g. 401
    message: string;  // e.g. "Request had invalid authentication credentials...""
    errors: {
      message: string;  // e.g. "Invalid Credentials"
      domain: string;  // e.g. "global"
      reason: string;  // e.g. "authError"
      location: string;  // e.g. "Authorization"
      locationType: string;  // e.g. "header"
    }[];
    status: string;  // e.g. 'UNAUTHENTICATED'
  }
}

// See https://developers.google.com/calendar/api/v3/reference/events/list
export interface GoogleListEventsResponseItem {
  // fields in which we are not interested have been omitted
  id: string;
  status: string;
  summary: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
}
export interface GoogleListEventsResponse {
  // fields in which we are not interested have been omitted
  nextSyncToken?: string;
  nextPageToken?: string;
  items: GoogleListEventsResponseItem[];
}

export type GoogleInsertEventResponse = GoogleListEventsResponseItem;
