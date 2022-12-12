import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { toISOStringUTCFromDateStrAndHourAndTz, toISOStringUTC } from '../dates.utils';
import type { EnvironmentVariables } from "../env.validation";
import type Meeting from "../meetings/meeting.entity";
import { encodeQueryParams } from '../misc.utils';
import User from "../users/user.entity";
import GoogleOAuth2 from "./google-oauth2.entity";
import type {
  IOAuth2Provider,
  OAuth2Config,
  PartialAuthzQueryParams,
  PartialRefreshParams,
  PartialTokenFormParams,
} from "./oauth2.service";
import type { GoogleListEventsResponse, GoogleListEventsResponseItem, GoogleInsertEventResponse } from './oauth2-response-types';
import {
  OAuth2CalendarEvent,
  OAuth2ErrorResponseError,
  OAuth2ProviderType,
  oidcScopes,
  MAX_EVENT_RESULTS,
} from './oauth2-common';
import type OAuth2Service from "./oauth2.service";
import GoogleCalendarEvents from "./google-calendar-events.entity";
import { Logger } from "@nestjs/common";
import GoogleCalendarCreatedEvent from "./google-calendar-created-event.entity";

const googleOidcScopes = [
  'openid',
  // Note that these are different from the standard OIDC scope names
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];
const googleCalendarScopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.owned',
];
const oauth2Config: OAuth2Config = {
  // See https://developers.google.com/identity/protocols/oauth2/web-server
  //     https://accounts.google.com/.well-known/openid-configuration
  authzEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
  scopes: [
    ...oidcScopes,
    ...googleCalendarScopes,
  ],
};
const GOOGLE_API_BASE_URL = 'https://www.googleapis.com';
const GOOGLE_API_CALENDAR_EVENTS_BASE_URL = `${GOOGLE_API_BASE_URL}/calendar/v3/calendars/primary/events`;

type GoogleOAuth2EnvConfig = {
  client_id: string;
  secret: string;
  redirect_uri: string;
};

export default class GoogleOAuth2Provider implements IOAuth2Provider {
  public readonly type = OAuth2ProviderType.GOOGLE;
  private readonly envConfig: GoogleOAuth2EnvConfig | undefined;
  private readonly logger = new Logger(GoogleOAuth2Provider.name);

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly oauth2Service: OAuth2Service,
    private readonly calendarEventsRepository: Repository<GoogleCalendarEvents>,
    private readonly calendarCreatedEventsRepository: Repository<GoogleCalendarCreatedEvent>,
  ) {
    const client_id = configService.get('OAUTH2_GOOGLE_CLIENT_ID', {infer: true});
    const secret = configService.get('OAUTH2_GOOGLE_CLIENT_SECRET', {infer: true});
    const redirect_uri = configService.get('OAUTH2_GOOGLE_REDIRECT_URI', {infer: true});
    if (client_id && secret && redirect_uri) {
      this.envConfig = {client_id, secret, redirect_uri};
    }
  }

  isConfigured(): boolean {
    return !!this.envConfig;
  }

  getStaticOAuth2Config(): OAuth2Config {
    return oauth2Config;
  }

  getScopesToExpectInResponse(): string[] {
    return [
      ...googleOidcScopes,
      ...googleCalendarScopes,
    ];
  }

  async getPartialAuthzQueryParams(): Promise<PartialAuthzQueryParams> {
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      access_type: 'offline',
    };
  }

  async getPartialTokenFormParams(): Promise<PartialTokenFormParams> {
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      client_secret: this.envConfig!.secret,
    };
  }

  async getPartialRefreshParams(): Promise<PartialRefreshParams> {
    return {
      client_id: this.envConfig!.client_id,
      client_secret: this.envConfig!.secret,
    };
  }

  setLinkedCalendarToTrue(user: User): void {
    user.GoogleOAuth2 = {LinkedCalendar: true} as GoogleOAuth2;
  }

  private GoogleListEventsResponseItem_to_OAuth2CalendarEvent(item: GoogleListEventsResponseItem): OAuth2CalendarEvent {
    return {
      ID: item.id,
      summary: item.summary,
      start: toISOStringUTC(new Date(item.start.dateTime)),
      end: toISOStringUTC(new Date(item.end.dateTime)),
    };
  }

  private mergeResultsFromIncrementalSync(
    events: OAuth2CalendarEvent[],
    newItems: GoogleListEventsResponseItem[]
  ): OAuth2CalendarEvent[] {
    const eventsMap: Record<string, OAuth2CalendarEvent> = {};
    for (const event of events) {
      eventsMap[event.ID] = event;
    }
    for (const item of newItems) {
      // See https://developers.google.com/calendar/api/v3/reference/events#resource
      if (item.status === 'cancelled') {
        delete eventsMap[item.id];
      } else {
        // update or insert
        eventsMap[item.id] = this.GoogleListEventsResponseItem_to_OAuth2CalendarEvent(item);
      }
    }
    return Object.values(eventsMap);
  }

  private async getEventsForMeetingUsingIncrementalSync(
    creds: GoogleOAuth2,
    userID: number,
    meetingID: number,
    timeMin: string,
    timeMax: string,
  ): Promise<{
    events: OAuth2CalendarEvent[],
    nextSyncToken: string | null,
    needToSaveEvents: boolean,
  } | null> {
    const existingEventsData = await this.calendarEventsRepository.findOneBy({
      UserID: userID, MeetingID: meetingID
    });
    if (
      !existingEventsData
      || !existingEventsData.SyncToken
      || existingEventsData.PrevTimeMin !== timeMin
      || existingEventsData.PrevTimeMax !== timeMax
    ) {
      return null;
    }
    const params = {syncToken: existingEventsData.SyncToken};
    const url = GOOGLE_API_CALENDAR_EVENTS_BASE_URL + '?' + encodeQueryParams(params);
    let response: GoogleListEventsResponse | undefined;
    try {
      response = await this.oauth2Service.apiRequest<GoogleListEventsResponse>(this, creds, url);
      this.logger.debug(response);
    } catch (err: any) {
      // See https://developers.google.com/calendar/api/guides/sync#full_sync_required_by_server
      if (
        err instanceof OAuth2ErrorResponseError
        && err.statusCode === 410
      ) {
        // Full synchronization required
        return null;
      }
      throw err;
    }
    // We don't want to perform pagination (for now)
    if (response.nextPageToken) {
      return null;
    }
    const thereAreNewEvents = response.items.length > 0;
    const existingEvents = existingEventsData.Events;
    const events =
      thereAreNewEvents
      ? this.mergeResultsFromIncrementalSync(existingEvents, response.items)
      : existingEvents;
    return {
      events,
      nextSyncToken: response.nextSyncToken || null,
      needToSaveEvents: thereAreNewEvents,
    };
  }

  private async getEventsForMeetingUsingFullSync(
    creds: GoogleOAuth2,
    google_apiTimeMin: string,
    google_apiTimeMax: string,
  ): Promise<{
    events: OAuth2CalendarEvent[],
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
    const response = await this.oauth2Service.apiRequest<GoogleListEventsResponse>(this, creds, url);
    this.logger.debug(response);
    const events = response.items.map(
      item => this.GoogleListEventsResponseItem_to_OAuth2CalendarEvent(item)
    );
    return {events, nextSyncToken: response.nextSyncToken || null};
  }

  async getEventsForMeeting(userID: number, meeting: Meeting): Promise<OAuth2CalendarEvent[]> {
    const creds = await this.oauth2Service.getOrRefreshCreds(this, userID) as GoogleOAuth2;
    if (!creds || !creds.LinkedCalendar) {
      return [];
    }
    const tentativeDates = meeting.TentativeDates;
    const minDate = tentativeDates.reduce((a, b) => a < b ? a : b);
    const maxDate = tentativeDates.reduce((a, b) => a > b ? a : b);
    const apiTimeMin = toISOStringUTCFromDateStrAndHourAndTz(minDate, meeting.MinStartHour, meeting.Timezone);
    const apiTimeMax = toISOStringUTCFromDateStrAndHourAndTz(maxDate, meeting.MaxEndHour, meeting.Timezone);
    const existingEventsData = await this.getEventsForMeetingUsingIncrementalSync(creds, userID, meeting.ID, apiTimeMin, apiTimeMax);
    let events: OAuth2CalendarEvent[];
    let nextSyncToken: string | null = null;
    let needToSaveEvents = true;
    if (existingEventsData) {
      ({events, nextSyncToken, needToSaveEvents} = existingEventsData);
    } else {
      const newEventsData = await this.getEventsForMeetingUsingFullSync(creds, apiTimeMin, apiTimeMax);
      ({events, nextSyncToken} = newEventsData);
    }
    if (needToSaveEvents) {
      await this.calendarEventsRepository.save({
        MeetingID: meeting.ID,
        UserID: userID,
        Events: events,
        PrevTimeMin: apiTimeMin,
        PrevTimeMax: apiTimeMax,
        SyncToken: nextSyncToken,
      });
    }
    // Filter out the event which we created for this meeting
    const createdEvent = await this.calendarCreatedEventsRepository.findOneBy({MeetingID: meeting.ID, UserID: userID});
    if (createdEvent) {
      events = events.filter(event => event.ID !== createdEvent.CreatedGoogleMeetingID);
    }
    return events;
  }
}
