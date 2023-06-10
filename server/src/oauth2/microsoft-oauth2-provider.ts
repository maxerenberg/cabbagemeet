import * as fs from 'fs';
import {
  createHash,
  randomBytes as randomBytesCb,
  randomInt as randomIntCb,
  X509Certificate,
} from 'crypto';
import { promisify } from 'util';
import { Logger } from '@nestjs/common';
import ConfigService from '../config/config.service';
import { Repository } from 'typeorm';
import type { Dispatcher } from 'undici';
import {
  SECONDS_PER_MINUTE,
  getSecondsSinceUnixEpoch,
  toISOStringUTCFromDateTimeStrAndTz,
  toISOStringUTCFromDateStrAndHourAndTz,
} from '../dates.utils';
import type Meeting from '../meetings/meeting.entity';
import { createPublicMeetingURL } from '../meetings/meetings.utils';
import { encodeQueryParams, jwtSign } from '../misc.utils';
import User from '../users/user.entity';
import AbstractOAuth2CalendarCreatedEvent from './abstract-oauth2-calendar-created-event.entity';
import MicrosoftOAuth2 from './microsoft-oauth2.entity';
import MicrosoftCalendarEvents from './microsoft-calendar-events.entity';
import type OAuth2Service from './oauth2.service';
import type {
  IOAuth2Provider,
  OAuth2Config,
  PartialAuthzQueryParams,
  PartialRefreshParams,
  PartialTokenFormParams,
} from './oauth2.service';
import {
  OAuth2ProviderType,
  oidcScopes,
  OAuth2InvalidStateError,
  OAuth2InvalidOrExpiredNonceError,
  OAuth2ErrorResponseError,
  OAuth2CalendarEvent,
} from './oauth2-common';
import type {
  MicrosoftCreateEventResponse,
  MicrosoftEventDeltaResponse,
} from './oauth2-response-types';
import AbstractOAuth2 from './abstract-oauth2.entity';
import CacherService from '../cacher/cacher.service';

const randomBytes: (size: number) => Promise<Buffer> = promisify(randomBytesCb);
const randomInt: (max: number) => Promise<number> = promisify(randomIntCb);

// See https://learn.microsoft.com/en-us/graph/api/resources/calendar?view=graph-rest-1.0&preserve-view=true
const microsoftCalendarScopes = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
];
function createOAuth2Config(tenantID: string): OAuth2Config {
  return {
    // See https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration
    authzEndpoint: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
    scopes: [...oidcScopes, 'offline_access', ...microsoftCalendarScopes],
  };
}

// See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#request-an-access-token-with-a-certificate-credential
const CLIENT_ASSERTION_TYPE =
  'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

const MICROSOFT_API_BASE_URL = 'https://graph.microsoft.com/v1.0';
// See https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0
//     https://learn.microsoft.com/en-us/graph/delta-query-events
const MICROSOFT_API_CALENDAR_EVENTS_DELTA_URL = `${MICROSOFT_API_BASE_URL}/me/calendarView/delta`;
const MICROSOFT_API_CALENDAR_EVENTS_URL = `${MICROSOFT_API_BASE_URL}/me/events`;

// See https://www.oauth.com/oauth2-servers/pkce/authorization-request/
const pkceCodeVerifierValidChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const pkceCodeVerifierLength = 43;
const codeChallengeLifetimeSeconds = 5 * SECONDS_PER_MINUTE;
async function generatePkceCodeVerifier(): Promise<string> {
  const arr = Array<string>(pkceCodeVerifierLength);
  for (let i = 0; i < pkceCodeVerifierLength; i++) {
    const randomIdx = await randomInt(pkceCodeVerifierValidChars.length);
    arr[i] = pkceCodeVerifierValidChars[randomIdx];
  }
  return arr.join('');
}
function generatePkceCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

// See https://learn.microsoft.com/en-us/azure/active-directory/develop/active-directory-certificate-credentials#header
function certificateToX5t(pemEncodedCert: string): string {
  const { fingerprint } = new X509Certificate(pemEncodedCert);
  // fingerprint looks like "E9:BE:7B:B0:60:7D:33:..."
  return Buffer.from(fingerprint.replace(/:/g, ''), 'hex').toString(
    'base64url',
  );
}

type MicrosoftOAuth2EnvConfig = {
  client_id: string;
  redirect_uri: string;
  private_key: Buffer;
};

function errorIsMicrosoftCalendarEventNoLongerExists(err: any): boolean {
  return (
    err instanceof OAuth2ErrorResponseError &&
    (err as OAuth2ErrorResponseError).statusCode === 404
  );
}

function slurp(filename: string): string {
  return fs.readFileSync(filename, { encoding: 'utf8' });
}

export default class MicrosoftOAuth2Provider implements IOAuth2Provider {
  public readonly type = OAuth2ProviderType.MICROSOFT;
  private readonly oauth2Config: OAuth2Config;
  private readonly envConfig: MicrosoftOAuth2EnvConfig | undefined;
  private readonly logger = new Logger(MicrosoftOAuth2Provider.name);
  private readonly publicURL: string;
  private readonly x5t: string | undefined;
  // Map each nonce to a code verifier. The nonce is stored in the 'state'
  // parameter passed to the authorization endpoint.
  private readonly codeVerifierCache: CacherService;

  constructor(
    configService: ConfigService,
    cacherService: CacherService,
    private readonly oauth2Service: OAuth2Service,
    private readonly calendarEventsRepository: Repository<MicrosoftCalendarEvents>,
  ) {
    const tenantID = configService.get('OAUTH2_MICROSOFT_TENANT_ID');
    this.oauth2Config = createOAuth2Config(tenantID);
    const client_id = configService.get('OAUTH2_MICROSOFT_CLIENT_ID');
    const redirect_uri = configService.get('OAUTH2_MICROSOFT_REDIRECT_URI');
    const certificatePath = configService.get(
      'OAUTH2_MICROSOFT_CERTIFICATE_PATH',
    );
    const certificate =
      configService.get('OAUTH2_MICROSOFT_CERTIFICATE') ||
      (certificatePath ? slurp(certificatePath) : undefined);
    const privateKeyPath = configService.get(
      'OAUTH2_MICROSOFT_PRIVATE_KEY_PATH',
    );
    const privateKey =
      configService.get('OAUTH2_MICROSOFT_PRIVATE_KEY') ||
      (privateKeyPath ? slurp(privateKeyPath) : undefined);
    this.publicURL = configService.get('PUBLIC_URL');
    this.codeVerifierCache = cacherService;
    if (client_id && redirect_uri && privateKey && certificate) {
      this.x5t = certificateToX5t(certificate);
      this.envConfig = {
        client_id,
        redirect_uri,
        private_key: Buffer.from(privateKey),
      };
    }
  }

  isConfigured(): boolean {
    return !!this.envConfig;
  }

  getStaticOAuth2Config(): OAuth2Config {
    return this.oauth2Config;
  }

  getScopesToExpectInResponse(): string[] {
    // Note that 'offline_access' will not be returned in the response
    return [...oidcScopes, ...microsoftCalendarScopes];
  }

  async getPartialAuthzQueryParams(): Promise<PartialAuthzQueryParams> {
    const nonce = (await randomBytes(16)).toString('base64url');
    const codeVerifier = await generatePkceCodeVerifier();
    const codeChallenge = generatePkceCodeChallenge(codeVerifier);
    await this.codeVerifierCache.add(
      nonce,
      codeVerifier,
      codeChallengeLifetimeSeconds,
    );
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      // This gets inserted into the 'state' parameter
      // See OAuth2Service.getRequestURL()
      serverNonce: nonce,
    };
  }

  // See https://learn.microsoft.com/en-us/azure/active-directory/develop/active-directory-certificate-credentials
  private generateClientAssertion(
    privateKey: Buffer,
    clientID: string,
  ): Promise<string> {
    const now = getSecondsSinceUnixEpoch();
    const header = {
      alg: 'RS256' as const,
      typ: 'JWT',
      x5t: this.x5t,
    };
    const payload = {
      aud: this.oauth2Config.tokenEndpoint,
      exp: now + 5 * SECONDS_PER_MINUTE,
      iss: clientID,
      nbf: now,
      sub: clientID,
      iat: now,
    };
    return jwtSign(payload, privateKey, { algorithm: header.alg, header });
  }

  async getPartialTokenFormParams(
    nonce?: string,
  ): Promise<PartialTokenFormParams> {
    if (!nonce) throw new OAuth2InvalidStateError();
    const codeVerifier = await this.codeVerifierCache.getAndPop(nonce);
    if (!codeVerifier) {
      throw new OAuth2InvalidOrExpiredNonceError();
    }
    // See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#request-an-access-token-with-a-certificate-credential
    const clientAssertion = await this.generateClientAssertion(
      this.envConfig.private_key!,
      this.envConfig.client_id!,
    );
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      code_verifier: codeVerifier,
      client_assertion_type: CLIENT_ASSERTION_TYPE,
      client_assertion: clientAssertion,
    };
  }

  async getPartialRefreshParams(): Promise<PartialRefreshParams> {
    const clientAssertion = await this.generateClientAssertion(
      this.envConfig.private_key!,
      this.envConfig.client_id!,
    );
    return {
      client_id: this.envConfig!.client_id,
      client_assertion_type: CLIENT_ASSERTION_TYPE,
      client_assertion: clientAssertion,
    };
  }

  setLinkedCalendarToTrue(user: User): void {
    user.MicrosoftOAuth2 = { LinkedCalendar: true } as MicrosoftOAuth2;
  }

  private async mergeEventsFromSingleRequest(
    creds: MicrosoftOAuth2,
    eventsMap: Record<string, OAuth2CalendarEvent>,
    url: string,
    apiStartDateTime: string,
    apiEndDateTime: string,
  ): Promise<MicrosoftEventDeltaResponse | null> {
    let response: MicrosoftEventDeltaResponse | undefined;
    try {
      response =
        await this.oauth2Service.apiRequest<MicrosoftEventDeltaResponse>(
          this,
          creds,
          url,
        );
      this.logger.debug(response);
    } catch (err: any) {
      // See https://learn.microsoft.com/en-us/graph/delta-query-overview?tabs=http#synchronization-reset
      if (err instanceof OAuth2ErrorResponseError && err.statusCode === 410) {
        // Full synchronization required
        return null;
      }
      throw err;
    }
    // Merge results
    for (const updatedEvent of response.value) {
      if (updatedEvent['@removed'] || updatedEvent.isCancelled) {
        delete eventsMap[updatedEvent.id];
        continue;
      }
      const newStartDateTime = updatedEvent.start
        ? toISOStringUTCFromDateTimeStrAndTz(
            updatedEvent.start.dateTime,
            updatedEvent.start.timeZone,
          )
        : undefined;
      const newEndDateTime = updatedEvent.end
        ? toISOStringUTCFromDateTimeStrAndTz(
            updatedEvent.end.dateTime,
            updatedEvent.end.timeZone,
          )
        : undefined;
      // See https://github.com/microsoftgraph/microsoft-graph-docs/issues/6599 - not every
      // event in the response is guaranteed to be in our original date range
      if (
        (newStartDateTime && newStartDateTime > apiEndDateTime) ||
        (newEndDateTime && newEndDateTime < apiStartDateTime)
      ) {
        continue;
      }
      const existingEvent = eventsMap[updatedEvent.id];
      if (existingEvent) {
        const update: Partial<OAuth2CalendarEvent> = {};
        if (newStartDateTime) update.start = newStartDateTime;
        if (newEndDateTime) update.end = newEndDateTime;
        if (updatedEvent.subject) update.summary = updatedEvent.subject;
        eventsMap[updatedEvent.id] = {
          ...existingEvent,
          ...update,
        };
      } else {
        eventsMap[updatedEvent.id] = {
          ID: updatedEvent.id,
          summary: updatedEvent.subject,
          start: newStartDateTime,
          end: newEndDateTime,
        };
      }
    }
    return response;
  }

  // TODO: reduce code duplication with GoogleOAuth2Provider
  private async getEventsForMeetingUsingIncrementalSync(
    creds: MicrosoftOAuth2,
    userID: number,
    meetingID: number,
    apiStartDateTime: string,
    apiEndDateTime: string,
  ): Promise<{
    events: OAuth2CalendarEvent[];
    deltaLink: string;
    needToSaveEvents: boolean;
  } | null> {
    const existingEventsData = await this.calendarEventsRepository.findOneBy({
      UserID: userID,
      MeetingID: meetingID,
    });
    if (
      !existingEventsData ||
      existingEventsData.PrevStartDateTime !== apiStartDateTime ||
      existingEventsData.PrevEndDateTime !== apiEndDateTime
    ) {
      return null;
    }
    // TODO: maybe it would be better to store the events as a map in the database?
    const eventsMap: Record<string, OAuth2CalendarEvent> = {};
    for (const existingEvent of existingEventsData.Events) {
      eventsMap[existingEvent.ID] = existingEvent;
    }
    let atLeastOneEventChanged = false;
    let nextLink = existingEventsData.DeltaLink;
    let deltaLink: string | undefined;
    for (;;) {
      const response = await this.mergeEventsFromSingleRequest(
        creds,
        eventsMap,
        nextLink,
        apiStartDateTime,
        apiEndDateTime,
      );
      if (!response) {
        return null;
      }
      atLeastOneEventChanged =
        atLeastOneEventChanged || response.value.length > 0;
      if (response['@odata.deltaLink']) {
        deltaLink = response['@odata.deltaLink'];
        break;
      }
      nextLink = response['@odata.nextLink'];
    }
    return {
      events: Object.values(eventsMap),
      deltaLink,
      needToSaveEvents: atLeastOneEventChanged,
    };
  }

  private async getEventsForMeetingUsingFullSync(
    creds: MicrosoftOAuth2,
    apiStartDateTime: string,
    apiEndDateTime: string,
  ): Promise<{
    events: OAuth2CalendarEvent[];
    deltaLink: string;
  }> {
    // See https://learn.microsoft.com/en-us/graph/query-parameters
    // Note that '$top' is not supported for the event delta API
    const params: Record<string, string> = {
      // See https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0
      // Update: '$select' doesn't seem to be doing anything, since all of the fields are being returned...
      $select: 'id,subject,start,end,isCancelled',
      startDateTime: apiStartDateTime,
      endDateTime: apiEndDateTime,
    };
    let url =
      MICROSOFT_API_CALENDAR_EVENTS_DELTA_URL + '?' + encodeQueryParams(params);
    const eventsMap: Record<string, OAuth2CalendarEvent> = {};
    for (;;) {
      const response = await this.mergeEventsFromSingleRequest(
        creds,
        eventsMap,
        url,
        apiStartDateTime,
        apiEndDateTime,
      );
      if (!response) {
        throw new Error('Unable to get events on full sync');
      }
      if (response['@odata.deltaLink']) {
        url = response['@odata.deltaLink'];
        break;
      }
      url = response['@odata.nextLink'];
    }
    return {
      events: Object.values(eventsMap),
      deltaLink: url,
    };
  }

  // TODO: reduce code duplication with GoogleOAuth2Provider
  async getEventsForMeeting(
    abstractCreds: AbstractOAuth2,
    meeting: Meeting,
  ): Promise<OAuth2CalendarEvent[]> {
    const creds = abstractCreds as MicrosoftOAuth2;
    const userID = creds.UserID;
    const tentativeDates = meeting.TentativeDates;
    const minDate = tentativeDates.reduce((a, b) => (a < b ? a : b));
    const maxDate = tentativeDates.reduce((a, b) => (a > b ? a : b));
    const apiStartDateTime = toISOStringUTCFromDateStrAndHourAndTz(
      minDate,
      meeting.MinStartHour,
      meeting.Timezone,
    );
    const apiEndDateTime = toISOStringUTCFromDateStrAndHourAndTz(
      maxDate,
      meeting.MaxEndHour,
      meeting.Timezone,
    );
    const existingEventsData =
      await this.getEventsForMeetingUsingIncrementalSync(
        creds,
        userID,
        meeting.ID,
        apiStartDateTime,
        apiEndDateTime,
      );
    let events: OAuth2CalendarEvent[];
    let deltaLink: string | null = null;
    let needToSaveEvents = true;
    if (existingEventsData) {
      ({ events, deltaLink, needToSaveEvents } = existingEventsData);
    } else {
      const newEventsData = await this.getEventsForMeetingUsingFullSync(
        creds,
        apiStartDateTime,
        apiEndDateTime,
      );
      ({ events, deltaLink } = newEventsData);
    }
    if (needToSaveEvents) {
      await this.calendarEventsRepository.save({
        MeetingID: meeting.ID,
        UserID: userID,
        Events: events,
        PrevStartDateTime: apiStartDateTime,
        PrevEndDateTime: apiEndDateTime,
        DeltaLink: deltaLink,
      });
    }
    // Filter out the event which we created for this meeting
    const createdEvent =
      creds.CreatedEvents.length > 0 ? creds.CreatedEvents[0] : null;
    if (createdEvent) {
      events = events.filter(
        (event) => event.ID !== createdEvent.CreatedEventID,
      );
    }

    return events;
  }

  // TODO: reduce code duplication with GoogleOAuth2Provider
  async apiCreateOrUpdateEvent(
    creds: AbstractOAuth2,
    existingEvent: AbstractOAuth2CalendarCreatedEvent,
    meeting: Meeting,
  ): Promise<string> {
    let apiMethod: Dispatcher.HttpMethod = 'POST';
    let apiURL = MICROSOFT_API_CALENDAR_EVENTS_URL;
    if (existingEvent) {
      // See https://learn.microsoft.com/en-us/graph/api/event-update?view=graph-rest-1.0
      apiURL += '/' + existingEvent.CreatedEventID;
      apiMethod = 'PATCH';
    }
    const meetingURL = createPublicMeetingURL(this.publicURL, meeting);
    // See https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0
    const params: Record<string, any> = {
      subject: meeting.Name,
      body: {
        content: meetingURL,
        contentType: 'text',
      },
      bodyPreview: meetingURL,
      start: {
        dateTime: meeting.ScheduledStartDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: meeting.ScheduledEndDateTime,
        timeZone: 'UTC',
      },
    };
    if (meeting.About) {
      params.body.content = meeting.About + '\n' + meetingURL;
      params.bodyPreview = meeting.About;
    }
    let response: MicrosoftCreateEventResponse | undefined;
    const body = JSON.stringify(params);
    const headers = { 'content-type': 'application/json' };
    try {
      response =
        await this.oauth2Service.apiRequest<MicrosoftCreateEventResponse>(
          this,
          creds,
          apiURL,
          { method: apiMethod, body, headers },
        );
    } catch (err) {
      if (existingEvent && errorIsMicrosoftCalendarEventNoLongerExists(err)) {
        // It's possible that the user deleted the event themselves. Try to create
        // a new one instead.
        response =
          await this.oauth2Service.apiRequest<MicrosoftCreateEventResponse>(
            this,
            creds,
            MICROSOFT_API_CALENDAR_EVENTS_URL,
            { method: 'POST', body, headers },
          );
      } else {
        throw err;
      }
    }
    return response.id;
  }

  async apiDeleteEvent(creds: AbstractOAuth2, eventID: string) {
    const apiURL = `${MICROSOFT_API_CALENDAR_EVENTS_URL}/${eventID}`;
    try {
      await this.oauth2Service.apiRequest(this, creds, apiURL, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (!errorIsMicrosoftCalendarEventNoLongerExists(err)) {
        throw err;
      }
    }
  }
}
