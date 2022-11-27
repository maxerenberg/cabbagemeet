import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Dispatcher, request } from 'undici';
import { EnvironmentVariables } from '../env.validation';
import { InjectRepository } from '@nestjs/typeorm';
import GoogleOAuth2 from './google-oauth2.entity';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { normalizeDBError, UniqueConstraintFailed } from '../database.utils';
import User from '../users/user.entity';
import { assert, encodeQueryParams, stripTrailingSlash } from '../misc.utils';
import { columnsForGetUser } from 'src/users/users.service';
import type { GoogleOIDCResponse, GoogleDecodedOIDCIDToken, GoogleRefreshTokenResponse, GoogleListEventsResponse, GoogleListEventsResponseItem, GoogleInsertEventResponse } from './oauth2-response-types';
import { toISOStringUTC, getSecondsSinceUnixEpoch, toISOStringWithTz } from '../dates.utils';
import MeetingsService from '../meetings/meetings.service';
import GoogleCalendarEvents, { GoogleCalendarEvent } from './google-calendar-events.entity';
import GoogleCalendarCreatedEvent from './google-calendar-created-event.entity';
import Meeting from '../meetings/meeting.entity';

// TODO: use truncated exponential backoff
// See https://developers.google.com/calendar/api/guides/quota

// TODO: add Microsoft
export enum OAuth2Provider {
  GOOGLE = 1,
}
export const oauth2Reasons = ['link', 'signup', 'login'] as const;
export type OAuth2Reason = typeof oauth2Reasons[number];
export type OAuth2State = {
  reason: OAuth2Reason;
  postRedirect: string;
  userID?: number;
  nonce?: string;
};
export class OAuth2NotConfiguredError extends Error {}
export class OAuth2ErrorResponseError extends Error {
  constructor(
    public statusCode: number,
    public errorCode?: string,
  ) {
    super();
  }
}
export class OAuth2NoRefreshTokenError extends Error {}
export class OAuth2NotAllScopesGrantedError extends Error {}
export class OAuth2AccountAlreadyLinkedError extends Error {}
export class OAuth2AccountNotLinkedError extends Error {}

type OAuth2Config = {
  authzEndpoint: string;
  tokenEndpoint: string;
  revokeEndpoint: string;
  scopes: string[];
};
type OAuth2Configs = {
  [key in OAuth2Provider]: OAuth2Config;
};
type OAuth2EnvConfig = {
  client_id: string;
  secret: string;
  redirect_uri: string;
};

const oidcScopes = ['openid', 'profile', 'email'] as const;
const oauth2Configs: OAuth2Configs = {
  [OAuth2Provider.GOOGLE]: {
    // See https://developers.google.com/identity/protocols/oauth2/web-server
    authzEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      ...oidcScopes,
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned',
    ],
  },
};
const GOOGLE_API_BASE_URL = 'https://www.googleapis.com';
const GOOGLE_API_CALENDAR_EVENTS_BASE_URL = `${GOOGLE_API_BASE_URL}/calendar/v3/calendars/primary/events`;
const MAX_EVENT_RESULTS = 100;

function errorIsGoogleCalendarEventNoLongerExists(err: any): boolean {
  return err instanceof OAuth2ErrorResponseError
    && (
      (err as OAuth2ErrorResponseError).statusCode === 404
      || (err as OAuth2ErrorResponseError).statusCode === 410
    );
}

@Injectable()
export default class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);
  private readonly publicURL: string;

  constructor(
    private configService: ConfigService<EnvironmentVariables, true>,
    private meetingsService: MeetingsService,
    private dataSource: DataSource,
    @InjectRepository(GoogleOAuth2) private googleOAuth2Repository: Repository<GoogleOAuth2>,
    @InjectRepository(GoogleCalendarEvents) private googleCalendarEventsRepository: Repository<GoogleCalendarEvents>,
    @InjectRepository(GoogleCalendarCreatedEvent) private googleCalendarCreatedEventsRepository: Repository<GoogleCalendarCreatedEvent>,
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {
    this.publicURL = stripTrailingSlash(configService.get('PUBLIC_URL', {infer: true}));
  }

  private getEnvKey<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.configService.get(key, {infer: true});
  }

  private getEnvKeyOrThrow<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    const val = this.getEnvKey(key);
    if (!val) {
      throw new OAuth2NotConfiguredError();
    }
    return val;
  }

  private getEnvConfigOrThrow(provider: OAuth2Provider): OAuth2EnvConfig {
    if (provider === OAuth2Provider.GOOGLE) {
      return {
        client_id: this.getEnvKeyOrThrow('OAUTH2_GOOGLE_CLIENT_ID'),
        secret: this.getEnvKeyOrThrow('OAUTH2_GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.getEnvKeyOrThrow('OAUTH2_GOOGLE_REDIRECT_URI'),
      };
    }
  }

  // When submitting content of type application/x-www-form-urlencoded,
  // ' ' needs to be converted into '+' instead of '%20'.
  // See https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding.
  private encodeFormQueryParams(params: Record<string, string>): string {
    return new URLSearchParams(params).toString();
  }

  private isSuccessStatusCode(statusCode: number): boolean {
    return statusCode - (statusCode % 100) === 200;
  }

  private async request(...args: Parameters<typeof request>) {
    const response = await request(...args);
    const {statusCode, body} = response;
    if (!this.isSuccessStatusCode(statusCode)) {
      const errorText = await body.text();
      let errorBody: any;
      let errorCodeStr: string | undefined;
      try {
        errorBody = JSON.parse(errorText);
      } catch (jsonErr) {}
      // If the token is expired or revoked, the Google API will return a 400 response like
      // {"error": "invalid_grant", "error_description": "Token has been expired or revoked."}
      if (
        typeof errorBody === 'object'
        && typeof errorBody.error === 'string'
      ) {
        errorCodeStr = errorBody.error;
      }
      this.logger.error(`statusCode=${statusCode} body=${errorText}`)
      throw new OAuth2ErrorResponseError(statusCode, errorCodeStr);
    }
    return response;
  }

  private async requestJSON<T>(...args: Parameters<typeof request>): Promise<T> {
    return (await this.request(...args)).body.json();
  }

  private allRequestedScopesArePresent(provider: OAuth2Provider, scopeStr: string): boolean {
    const responseScopes = scopeStr.split(' ');
    const requestedScopes = oauth2Configs[provider].scopes;
    // I've noticed that Google renames some of the common OIDC scopes
    // (e.g. profile => https://www.googleapis.com/auth/userinfo.profile),
    // so we don't need to check those ones.
    return requestedScopes.every(
      reqScope => (oidcScopes as readonly string[]).includes(reqScope)
               || responseScopes.includes(reqScope)
    );
  }

  getRequestURL(provider: OAuth2Provider, state: OAuth2State): string {
    const {client_id, secret, redirect_uri} = this.getEnvConfigOrThrow(provider);
    if (!client_id || !secret || !redirect_uri) {
      throw new OAuth2NotConfiguredError();
    }
    const {authzEndpoint, scopes} = oauth2Configs[provider];
    // TODO: nonce (required by Microsoft API)
    const params: Record<string, string> = {
      client_id,
      redirect_uri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      state: JSON.stringify(state),
    };
    if (state.reason === 'link' || state.reason === 'signup') {
      params.prompt = 'consent';
    }
    return authzEndpoint + '?' + encodeQueryParams(params);
  }

  private async google_getTokenFromCode(code: string, state: OAuth2State): Promise<{
    data: GoogleOIDCResponse;
    decodedIDToken: GoogleDecodedOIDCIDToken;
  }> {
    const provider = OAuth2Provider.GOOGLE;
    const {client_id, secret, redirect_uri} = this.getEnvConfigOrThrow(provider);
    const {tokenEndpoint} = oauth2Configs[provider];
    // See https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
    const requestBody = this.encodeFormQueryParams({
      code,
      client_id,
      client_secret: secret,
      redirect_uri,
      grant_type: 'authorization_code',
    });
    const data = await this.requestJSON<GoogleOIDCResponse>(tokenEndpoint, {
      method: 'POST',
      body: requestBody,
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    });
    this.logger.debug(data);
    const decodedIDToken = jwt.decode(data.id_token) as GoogleDecodedOIDCIDToken;
    this.logger.debug(decodedIDToken);
    return {data, decodedIDToken};
  }

  private async google_refreshAccessToken(creds: GoogleOAuth2): Promise<GoogleOAuth2> {
    const provider = OAuth2Provider.GOOGLE;
    const {client_id, secret} = this.getEnvConfigOrThrow(provider);
    const {tokenEndpoint} = oauth2Configs[provider];
    // See https://developers.google.com/identity/protocols/oauth2/web-server#offline
    const requestBody = this.encodeFormQueryParams({
      client_id,
      client_secret: secret,
      grant_type: 'refresh_token',
      refresh_token: creds.RefreshToken,
    });
    this.logger.debug(`POST ${tokenEndpoint}`);
    let data: GoogleRefreshTokenResponse | undefined;
    try {
      data = await this.requestJSON<GoogleRefreshTokenResponse>(tokenEndpoint, {
        method: 'POST',
        body: requestBody,
        headers: {'content-type': 'application/x-www-form-urlencoded'},
      });
    } catch (err: any) {
      await this.google_deleteCredsIfErrorIsInvalidToken(err, creds);
      throw err;
    }
    const partialCreds: Partial<GoogleOAuth2> = {
      AccessToken: data.access_token,
      AccessTokenExpiresAt: this.calculateTokenExpirationTime(data.expires_in),
    };
    await this.googleOAuth2Repository.update({UserID: creds.UserID}, partialCreds);
    return {...creds, ...partialCreds};
  }

  private checkThatNameAndEmailClaimsArePresent<T extends {
    name?: string;
    email?: string;
  }>(decodedIDToken: T) {
    for (const claim of ['name', 'email'] as const) {
      if (!decodedIDToken[claim]) {
        this.logger.error(`'${claim}' is missing from the ID token`);
        throw new OAuth2NoRefreshTokenError();
      }
    }
  }

  /*
    Three possible response types:
    1. user: set; isLinkedToAccountFromOIDCResponse: true; pendingOAuth2Entity: not set
       The response from the OIDC server was successfully associated with
       an existing account and the user may be logged in.
    2. user: set; isLinkedToAccountFromOIDCResponse: false; pendingOAuth2Entity: set
       An account exists with the email address received from the OIDC server,
       but it was never explicitly linked. We need to ask the user for confirmation
       that they want to link these accounts.
    3. user: not set; isLinkedToAccountFromOIDCResponse: false; pendingOAuth2Entity: not set
       An account linked to this Google account existed previously, but it was
       deleted, and the OIDC server still thinks that we own the credentials, so
       it's not giving us a refresh token, but we already discarded the credentials.
       We need to force the user to go through the consent screen again.
  */
  async google_handleLogin(code: string, state: OAuth2State): Promise<{
    isLinkedToAccountFromOIDCResponse: boolean;
    user?: User;
    pendingOAuth2Entity?: DeepPartial<GoogleOAuth2>;
  }> {
    assert(state.reason === 'login');
    const {data, decodedIDToken} = await this.google_getTokenFromCode(code, state);
    this.checkThatNameAndEmailClaimsArePresent(decodedIDToken);
    const userBySub: User | null = await this.usersRepository
      .createQueryBuilder('User')
      .leftJoin('User.GoogleOAuth2', 'GoogleOAuth2')
      .select(columnsForGetUser)
      .where('GoogleOAuth2.Sub = :sub', {sub: decodedIDToken.sub})
      .getOne();
    if (userBySub) {
      // update the credentials stored in the database
      const partialCreds: Partial<GoogleOAuth2> = {
        AccessToken: data.access_token,
        AccessTokenExpiresAt: this.calculateTokenExpirationTime(data.expires_in),
      };
      if (data.refresh_token) {
        partialCreds.RefreshToken = data.refresh_token;
      }
      await this.googleOAuth2Repository.update({UserID: userBySub.ID}, partialCreds);
      return {user: userBySub, isLinkedToAccountFromOIDCResponse: true};
    }
    const userByEmail: User | null = await this.usersRepository
      .createQueryBuilder('User')
      .leftJoin('User.GoogleOAuth2', 'GoogleOAuth2')
      .select(columnsForGetUser)
      .where('User.Email = :email', {email: decodedIDToken.email!})
      .getOne();
    if (userByEmail) {
      return {
        user: userByEmail,
        isLinkedToAccountFromOIDCResponse: false,
        pendingOAuth2Entity: this.google_createOAuth2Entity(userByEmail.ID, data, decodedIDToken),
      };
    }
    // At this point, assume that the user actually wanted to sign up
    // rather than logging in. This is an easy mistake to make, given
    // that "Sign in with Google" buttons are commonly used to sign up
    // new users.
    if (!data.refresh_token) {
      // We need to force the user to go through the consent screen again
      return {isLinkedToAccountFromOIDCResponse: false};
    }
    const newUser = await this.google_updateDatabaseFromOIDCResponseForSignup(data, decodedIDToken);
    return {user: newUser, isLinkedToAccountFromOIDCResponse: true};
  }

  private calculateTokenExpirationTime(expires_in: number): number {
    // Subtract a few seconds to compensate for the time it takes for
    // requests to the OAuth2 server to complete
    return getSecondsSinceUnixEpoch() + expires_in - 5;
  }

  private google_createOAuth2Entity(
    userID: number,
    data: GoogleOIDCResponse,
    decodedIDToken: GoogleDecodedOIDCIDToken,
  ): DeepPartial<GoogleOAuth2> {
    return {
      UserID: userID,
      Sub: decodedIDToken.sub,
      AccessTokenExpiresAt: this.calculateTokenExpirationTime(data.expires_in),
      AccessToken: data.access_token,
      RefreshToken: data.refresh_token,
    };
  }

  async google_fetchAndStoreUserInfoForSignup(code: string, state: OAuth2State): Promise<User> {
    const {data, decodedIDToken} = await this.google_getTokenFromCode(code, state);
    this.google_checkThatRefreshTokenAndScopesArePresent(data, decodedIDToken);
    return this.google_updateDatabaseFromOIDCResponseForSignup(data, decodedIDToken);
  }

  async google_fetchAndStoreUserInfoForLinking(code: string, state: OAuth2State) {
    const {data, decodedIDToken} = await this.google_getTokenFromCode(code, state);
    this.google_checkThatRefreshTokenAndScopesArePresent(data, decodedIDToken);
    await this.google_updateDatabaseFromOIDCResponseForLinking(state.userID!, data, decodedIDToken);
  }

  private google_checkThatRefreshTokenAndScopesArePresent(data: GoogleOIDCResponse, decodedIDToken: GoogleDecodedOIDCIDToken) {
    const provider = OAuth2Provider.GOOGLE;
    if (!data.refresh_token) {
      this.logger.error('Refresh token was not present');
      throw new OAuth2NoRefreshTokenError();
    }
    if (!this.allRequestedScopesArePresent(provider, data.scope)) {
      this.logger.error('Not all requested scopes were present: ' + data.scope);
      throw new OAuth2NotAllScopesGrantedError();
    }
  }

  private async google_updateDatabaseFromOIDCResponseForSignup(
    data: GoogleOIDCResponse,
    decodedIDToken: GoogleDecodedOIDCIDToken,
  ): Promise<User> {
    this.checkThatNameAndEmailClaimsArePresent(decodedIDToken);
    this.google_checkThatRefreshTokenAndScopesArePresent(data, decodedIDToken);
    try {
      let newUser: User;
      await this.dataSource.transaction(async manager => {
        await manager.insert(User, {
          Name: decodedIDToken.name!,
          Email: decodedIDToken.email!,
        });
        newUser = await manager.findOneBy(User, {Email: decodedIDToken.email!});
        await manager.insert(
          GoogleOAuth2,
          this.google_createOAuth2Entity(newUser.ID, data, decodedIDToken)
        );
      });
      return newUser;
    } catch (err: any) {
      err = normalizeDBError(err as Error);
      if (err instanceof UniqueConstraintFailed) {
        throw new OAuth2AccountAlreadyLinkedError();
      }
      throw err;
    }
  }

  private async google_updateDatabaseFromOIDCResponseForLinking(
    userID: number,
    data: GoogleOIDCResponse,
    decodedIDToken: GoogleDecodedOIDCIDToken,
  ) {
    try {
      await this.googleOAuth2Repository.insert(
        this.google_createOAuth2Entity(userID, data, decodedIDToken)
      );
    } catch (err: any) {
      err = normalizeDBError(err as Error);
      if (err instanceof UniqueConstraintFailed) {
        throw new OAuth2AccountAlreadyLinkedError();
      }
      throw err;
    }
  }

  async google_linkAccountFromConfirmation(oauth2Entity: DeepPartial<GoogleOAuth2>) {
    try {
      await this.googleOAuth2Repository.insert(oauth2Entity);
    } catch (err: any) {
      err = normalizeDBError(err as Error);
      if (err instanceof UniqueConstraintFailed) {
        throw new OAuth2AccountAlreadyLinkedError();
      }
      throw err;
    }
  }

  private async google_refreshCredsIfNecessary(creds: GoogleOAuth2): Promise<GoogleOAuth2> {
    if (creds.AccessTokenExpiresAt > getSecondsSinceUnixEpoch()) {
      return creds;
    }
    return this.google_refreshAccessToken(creds);
  }

  private async google_getOrRefreshCreds(userID: number): Promise<GoogleOAuth2 | null> {
    const creds = await this.googleOAuth2Repository.findOneBy({UserID: userID});
    if (!creds) {
      return null;
    }
    return this.google_refreshCredsIfNecessary(creds);
  }

  private async google_deleteCredsIfErrorIsInvalidToken(err: any, creds: GoogleOAuth2) {
    if (
      err instanceof OAuth2ErrorResponseError
      && (
        (err as OAuth2ErrorResponseError).statusCode === 401
        || (err as OAuth2ErrorResponseError).errorCode === 'invalid_grant'
      )
    ) {
      // Invalid authentication credentials. Assume that the user revoked access
      this.logger.warn(`Invalid credentials for userID=${creds.UserID}. Deleting all OAuth2 data.`);
      await this.googleOAuth2Repository.delete(creds.UserID);
    }
  }

  private async google_apiRequest<T>(creds: GoogleOAuth2, ...args: Parameters<typeof request>): Promise<T | null> {
    const accessToken = creds.AccessToken;
    if (args.length < 2) {
      args.push({});
    }
    if (!args[1].headers) {
      args[1].headers = {};
    }
    if (Array.isArray(args[1].headers)) {
      args[1].headers.push('authorization', `Bearer ${accessToken}`);
    } else {
      args[1].headers.authorization = `Bearer ${accessToken}`;
    }
    // Log the method and URL
    this.logger.debug((args[1]?.method || 'GET') + ' ' + args[0]);
    try {
      const {headers, body} = await this.request(...args);
      // The content-type can be e.g. "application/json; charset=UTF-8"
      if (headers['content-type']?.startsWith('application/json')) {
        return body.json();
      } else {
        // Some API endpoints, like deleting an event, return no response body
        return null;
      }
    } catch (err: any) {
      await this.google_deleteCredsIfErrorIsInvalidToken(err, creds);
      throw err;
    }
  }

  async google_unlinkAccount(userID: number) {
    const {revokeEndpoint} = oauth2Configs[OAuth2Provider.GOOGLE];
    const creds = await this.googleOAuth2Repository.findOneBy({UserID: userID});
    if (!creds) {
      return;
    }
    const user = await this.usersRepository.findOneBy({ID: userID})!;
    if (!user.PasswordHash) {
      // We want to make sure that the user has at least one way to sign in.
      // If they originally signed up via an OAuth2 provider, then we'll delete
      // the calendar data, but keep the OAuth2 token so that they can still sign in.
      await this.dataSource.transaction(async manager => {
        await manager.update(GoogleOAuth2, {UserID: userID}, {LinkedCalendar: false});
        await manager.delete(GoogleCalendarEvents, {UserID: userID});
      });
      return;
    }
    // See https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
    await this.request(revokeEndpoint, {
      method: 'POST',
      body: this.encodeFormQueryParams({token: creds.RefreshToken}),
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    });
    await this.googleOAuth2Repository.delete(userID);
  }

  private GoogleListEventsResponseItem_to_GoogleCalendarEvent(item: GoogleListEventsResponseItem): GoogleCalendarEvent {
    return {
      ID: item.id,
      summary: item.summary,
      start: toISOStringUTC(new Date(item.start.dateTime)),
      end: toISOStringUTC(new Date(item.end.dateTime)),
    };
  }

  private google_mergeResultsFromIncrementalSync(
    events: GoogleCalendarEvent[],
    newItems: GoogleListEventsResponseItem[]
  ): GoogleCalendarEvent[] {
    const eventsMap: Record<string, GoogleCalendarEvent> = {};
    for (const event of events) {
      eventsMap[event.ID] = event;
    }
    for (const item of newItems) {
      // See https://developers.google.com/calendar/api/v3/reference/events#resource
      if (item.status === 'cancelled') {
        delete eventsMap[item.id];
      } else {
        // update or insert
        eventsMap[item.id] = this.GoogleListEventsResponseItem_to_GoogleCalendarEvent(item);
      }
    }
    return Object.values(eventsMap);
  }

  private async google_getEventsForMeetingUsingIncrementalSync(
    creds: GoogleOAuth2,
    userID: number,
    meetingID: number,
    google_apiTimeMin: string,
    google_apiTimeMax: string,
  ): Promise<{
    events: GoogleCalendarEvent[],
    nextSyncToken: string | null,
    needToSaveEvents: boolean;
  } | null> {
    const existingEventsData = await this.googleCalendarEventsRepository.findOneBy({
      UserID: userID, MeetingID: meetingID
    });
    if (
      !existingEventsData
      || !existingEventsData.SyncToken
      || existingEventsData.PrevTimeMin !== google_apiTimeMin
      || existingEventsData.PrevTimeMax !== google_apiTimeMax
    ) {
      return null;
    }
    const params = {syncToken: existingEventsData.SyncToken};
    const url = GOOGLE_API_CALENDAR_EVENTS_BASE_URL + '?' + encodeQueryParams(params);
    let response: GoogleListEventsResponse | undefined;
    try {
      response = await this.google_apiRequest<GoogleListEventsResponse>(creds, url);
      this.logger.debug(response);
    } catch (err: any) {
      // See https://developers.google.com/calendar/api/guides/sync#full_sync_required_by_server
      if (!(
        err instanceof OAuth2ErrorResponseError
        && (err as OAuth2ErrorResponseError).statusCode === 410
      )) {
        throw err;
      }
    }
    // We don't want to perform pagination (for now)
    if (!response || response.nextPageToken) {
      return null;
    }
    const thereAreNewEvents = response.items.length > 0;
    const existingEvents = JSON.parse(existingEventsData.Events) as GoogleCalendarEvent[];
    const events =
      thereAreNewEvents
      ? this.google_mergeResultsFromIncrementalSync(existingEvents, response.items)
      : existingEvents;
    return {
      events,
      nextSyncToken: response.nextSyncToken || null,
      needToSaveEvents: thereAreNewEvents,
    };
  }

  private async google_getEventsForMeetingUsingFullSync(
    creds: GoogleOAuth2,
    google_apiTimeMin: string,
    google_apiTimeMax: string,
  ): Promise<{
    events: GoogleCalendarEvent[],
    nextSyncToken: string | null,
  } | null> {
    // Make sure to NOT use orderBy, otherwise a syncToken won't be returned
    const params: Record<string, string> = {
      maxAttendees: '1',
      maxResults: String(MAX_EVENT_RESULTS),
      singleEvents: 'true',
      timeMin: google_apiTimeMin,
      timeMax: google_apiTimeMax,
    };
    const url = GOOGLE_API_CALENDAR_EVENTS_BASE_URL + '?' + encodeQueryParams(params);
    const response = await this.google_apiRequest<GoogleListEventsResponse>(creds, url);
    this.logger.debug(response);
    const events = response.items.map(
      item => this.GoogleListEventsResponseItem_to_GoogleCalendarEvent(item)
    );
    return {events, nextSyncToken: response.nextSyncToken || null};
  }

  async google_getEventsForMeeting(userID: number, meetingID: number): Promise<GoogleCalendarEvent[]> {
    const creds = await this.google_getOrRefreshCreds(userID);
    if (!creds || !creds.LinkedCalendar) {
      return [];
    }
    const meeting = await this.meetingsService.getMeetingOrThrow(meetingID);
    const tentativeDates = JSON.parse(meeting.TentativeDates) as string[];
    const minDate = tentativeDates.reduce((a, b) => a < b ? a : b);
    const maxDate = tentativeDates.reduce((a, b) => a > b ? a : b);
    const google_apiTimeMin = toISOStringWithTz(minDate, meeting.MinStartHour, meeting.Timezone);
    const google_apiTimeMax = toISOStringWithTz(maxDate, meeting.MaxEndHour, meeting.Timezone);
    let existingEventsData = await this.google_getEventsForMeetingUsingIncrementalSync(creds, userID, meetingID, google_apiTimeMin, google_apiTimeMax);
    let events: GoogleCalendarEvent[];
    let nextSyncToken: string | null = null;
    let needToSaveEvents = true;
    if (existingEventsData) {
      ({events, nextSyncToken, needToSaveEvents} = existingEventsData);
    } else {
      const newEventsData = await this.google_getEventsForMeetingUsingFullSync(creds, google_apiTimeMin, google_apiTimeMax);
      ({events, nextSyncToken} = newEventsData);
    }
    if (needToSaveEvents) {
      await this.googleCalendarEventsRepository.save({
        MeetingID: meetingID,
        UserID: userID,
        Events: JSON.stringify(events),
        PrevTimeMin: google_apiTimeMin,
        PrevTimeMax: google_apiTimeMax,
        SyncToken: nextSyncToken,
      });
    }
    // Filter out the event which we created for this meeting
    const createdEvent = await this.googleCalendarCreatedEventsRepository.findOneBy({MeetingID: meetingID, UserID: userID});
    if (createdEvent) {
      events = events.filter(event => event.ID !== createdEvent.CreatedGoogleMeetingID);
    }
    return events;
  }

  private getRespondentsLinkedWithGoogle(meetingID: number) {
    return this.googleOAuth2Repository
      .createQueryBuilder()
      .innerJoin('GoogleOAuth2.User', 'User')
      .innerJoin(
        'User.Respondents', 'MeetingRespondent',
        'MeetingRespondent.MeetingID = :meetingID', {meetingID}
      )
      .leftJoin(
        'GoogleOAuth2.CreatedEvents', 'GoogleCalendarCreatedEvent',
        'GoogleCalendarCreatedEvent.MeetingID = :meetingID', {meetingID}
      )
      .where('GoogleOAuth2.LinkedCalendar = true')
      .select(['GoogleOAuth2', 'GoogleCalendarCreatedEvent'])
      .getMany();
  }

  async google_tryCreateOrUpdateEventsForMeeting(meeting: Meeting) {
    if (meeting.ScheduledStartDateTime === null || meeting.ScheduledEndDateTime === null) {
      return;
    }
    const linkedRespondents = await this.getRespondentsLinkedWithGoogle(meeting.ID);
    const results = await Promise.allSettled(linkedRespondents.map(
      linkedRespondent => this.google_createOrUpdateEventForMeeting(
        linkedRespondent,
        linkedRespondent.CreatedEvents.length > 0 ? linkedRespondent.CreatedEvents[0] : null,
        meeting,
      )
    ));
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(result.reason);
      }
    }
  }

  private async google_createOrUpdateEventForMeeting(
    creds: GoogleOAuth2,
    existingEvent: GoogleCalendarCreatedEvent | null,
    meeting: Meeting,
  ): Promise<void> {
    if (meeting.ScheduledStartDateTime === null || meeting.ScheduledEndDateTime === null) {
      return;
    }
    creds = await this.google_refreshCredsIfNecessary(creds);
    const userID = creds.UserID;
    let apiURL = GOOGLE_API_CALENDAR_EVENTS_BASE_URL;
    let apiMethod: Dispatcher.HttpMethod = 'POST';
    if (existingEvent) {
      // See https://developers.google.com/calendar/api/v3/reference/events/update
      apiURL += '/' + existingEvent.CreatedGoogleMeetingID;
      apiMethod = 'PUT';
    }
    const params: Record<string, any> = {
      start: {
        dateTime: meeting.ScheduledStartDateTime,
      },
      end: {
        dateTime: meeting.ScheduledEndDateTime,
      },
      description: meeting.About,
      summary: meeting.Name,
      source: {
        url: `${this.publicURL}/m/${meeting.ID}`,
      },
    };
    let response: GoogleInsertEventResponse | undefined;
    const body = JSON.stringify(params);
    const headers = {'content-type': 'application/json'};
    try {
      response = await this.google_apiRequest<GoogleInsertEventResponse>(
        creds, apiURL, {method: apiMethod, body, headers}
      );
    } catch (err: any) {
      if (existingEvent && errorIsGoogleCalendarEventNoLongerExists(err)) {
        // It's possible that the user deleted the event themselves. Try to create
        // a new one instead.
        response = await this.google_apiRequest<GoogleInsertEventResponse>(
          creds, GOOGLE_API_CALENDAR_EVENTS_BASE_URL, {method: 'POST', body, headers}
        );
      } else {
        throw err;
      }
    }
    await this.googleCalendarCreatedEventsRepository.save({
      MeetingID: meeting.ID,
      UserID: userID,
      CreatedGoogleMeetingID: response.id,
    });
  }

  async google_tryCreateOrUpdateEventForMeeting(userID: number, meeting: Meeting) {
    if (meeting.ScheduledStartDateTime === null || meeting.ScheduledEndDateTime === null) {
      return;
    }
    const creds = await this.googleOAuth2Repository
      .createQueryBuilder()
      .innerJoin('GoogleOAuth2.User', 'User')
      .leftJoin(
        'GoogleOAuth2.CreatedEvents', 'GoogleCalendarCreatedEvent',
        'GoogleCalendarCreatedEvent.MeetingID = :meetingID', {meetingID: meeting.ID}
      )
      .where('GoogleOAuth2.UserID = :userID', {userID})
      .where('GoogleOAuth2.LinkedCalendar = true')
      .select(['GoogleOAuth2', 'GoogleCalendarCreatedEvent'])
      .getOne();
    if (!creds) {
      return;
    }
    try {
      await this.google_createOrUpdateEventForMeeting(
        creds,
        creds.CreatedEvents.length > 0 ? creds.CreatedEvents[0] : null,
        meeting,
      );
    } catch (err: any) {
      this.logger.error(err);
    }
  }

  async google_tryDeleteEventsForMeeting(meetingID: number) {
    const linkedRespondents = await this.getRespondentsLinkedWithGoogle(meetingID);
    const results = await Promise.allSettled(linkedRespondents.map(
      linkedRespondent => this.google_deleteEventForMeeting(
        linkedRespondent,
        linkedRespondent.CreatedEvents.length > 0 ? linkedRespondent.CreatedEvents[0] : null,
      )
    ));
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(result.reason);
      }
    }
  }

  private async google_deleteEventForMeeting(creds: GoogleOAuth2, event: GoogleCalendarCreatedEvent | null): Promise<void> {
    if (!event) {
      return;
    }
    creds = await this.google_refreshCredsIfNecessary(creds);
    const apiURL = `${GOOGLE_API_CALENDAR_EVENTS_BASE_URL}/${event.CreatedGoogleMeetingID}`;
    try {
      await this.google_apiRequest(creds, apiURL, {method: 'DELETE'});
    } catch (err: any) {
      if (!errorIsGoogleCalendarEventNoLongerExists(err)) {
        throw err;
      }
    }
    await this.googleCalendarCreatedEventsRepository.delete({
      MeetingID: event.MeetingID, UserID: creds.UserID
    });
  }

  async google_tryDeleteEventForMeeting(userID: number, meetingID: number) {
    const creds = await this.googleOAuth2Repository
      .createQueryBuilder()
      .innerJoin(
        'GoogleOAuth2.CreatedEvents', 'GoogleCalendarCreatedEvent',
        'GoogleCalendarCreatedEvent.MeetingID = :meetingID', {meetingID}
      )
      .where('GoogleOAuth2.UserID = :userID', {userID})
      .where('GoogleOAuth2.LinkedCalendar = true')
      .select(['GoogleOAuth2', 'GoogleCalendarCreatedEvent'])
      .getOne();
    if (!creds) {
      return;
    }
    try {
      await this.google_deleteEventForMeeting(creds, creds.CreatedEvents[0]);
    } catch (err: any) {
      this.logger.error(err);
    }
  }
}
