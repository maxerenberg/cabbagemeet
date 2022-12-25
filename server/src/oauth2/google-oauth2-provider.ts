import ConfigService from '../config/config.service';
import { Repository } from 'typeorm';
import type { Dispatcher } from 'undici';
import {
  toISOStringUTCFromDateStrAndHourAndTz,
  toISOStringUTC,
  toISOStringUTCFromDateTimeStr,
} from '../dates.utils';
import type Meeting from '../meetings/meeting.entity';
import { encodeQueryParams } from '../misc.utils';
import User from '../users/user.entity';
import GoogleOAuth2 from './google-oauth2.entity';
import type {
  IOAuth2Provider,
  OAuth2Config,
  PartialAuthzQueryParams,
  PartialRefreshParams,
  PartialTokenFormParams,
} from './oauth2.service';
import type {
  GoogleListEventsResponse,
  GoogleListEventsResponseItem,
  GoogleInsertEventResponse,
} from './oauth2-response-types';
import {
  AbstractOAuth2CalendarCreatedEvent,
  OAuth2CalendarEvent,
  OAuth2ErrorResponseError,
  OAuth2ProviderType,
  oidcScopes,
} from './oauth2-common';
import type OAuth2Service from './oauth2.service';
import GoogleCalendarEvents from './google-calendar-events.entity';
import { Logger } from '@nestjs/common';
import GoogleCalendarCreatedEvent from './google-calendar-created-event.entity';
import AbstractOAuth2 from './abstract-oauth2.entity';

const googleOidcScopes = [
  'openid',
  // Note that these are different from the standard OIDC scope names
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];
const googleCalendarScopes = [
  // See https://developers.google.com/identity/protocols/oauth2/scopes#calendar
  'https://www.googleapis.com/auth/calendar.events.owned',
];
const oauth2Config: OAuth2Config = {
  // See https://developers.google.com/identity/protocols/oauth2/web-server
  //     https://accounts.google.com/.well-known/openid-configuration
  authzEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
  scopes: [...oidcScopes, ...googleCalendarScopes],
};
const GOOGLE_API_BASE_URL = 'https://www.googleapis.com';
const GOOGLE_API_CALENDAR_EVENTS_BASE_URL = `${GOOGLE_API_BASE_URL}/calendar/v3/calendars/primary/events`;

type GoogleOAuth2EnvConfig = {
  client_id: string;
  secret: string;
  redirect_uri: string;
};

function errorIsGoogleCalendarEventNoLongerExists(err: any): boolean {
  return (
    err instanceof OAuth2ErrorResponseError &&
    ((err as OAuth2ErrorResponseError).statusCode === 404 ||
      (err as OAuth2ErrorResponseError).statusCode === 410)
  );
}

function GoogleListEventsResponseItem_to_OAuth2CalendarEvent(
  item: GoogleListEventsResponseItem,
): OAuth2CalendarEvent {
  // Google API responses use RFC3339, which SHOULD include timezone
  // information, so it should be safe to pass the dateTime field to
  // the Date constructor.
  // https://developers.google.com/calendar/api/v3/reference/events#resource
  // https://www.rfc-editor.org/rfc/rfc3339#section-5.6
  return {
    ID: item.id,
    summary: item.summary,
    start: toISOStringUTC(new Date(item.start.dateTime)),
    end: toISOStringUTC(new Date(item.end.dateTime)),
  };
}

function filterOutEventsWhichAreOutOfRange(
  events: GoogleListEventsResponseItem[],
  timeMin: string,
  timeMax: string,
): GoogleListEventsResponseItem[] {
  return events.filter(
    ({ start, end }) =>
      // If an event doesn't have start/end info, then it's a deleted
      // event, so we need to keep it in our list
      start === undefined || end === undefined || (
        toISOStringUTCFromDateTimeStr(end.dateTime) > timeMin &&
        toISOStringUTCFromDateTimeStr(start.dateTime) < timeMax
      )
  );
}

export default class GoogleOAuth2Provider implements IOAuth2Provider {
  public readonly type = OAuth2ProviderType.GOOGLE;
  private readonly envConfig: GoogleOAuth2EnvConfig | undefined;
  private readonly logger = new Logger(GoogleOAuth2Provider.name);
  private readonly publicURL: string;

  constructor(
    configService: ConfigService,
    private readonly oauth2Service: OAuth2Service,
    private readonly calendarEventsRepository: Repository<GoogleCalendarEvents>,
    private readonly calendarCreatedEventsRepository: Repository<GoogleCalendarCreatedEvent>,
  ) {
    const client_id = configService.get('OAUTH2_GOOGLE_CLIENT_ID');
    const secret = configService.get('OAUTH2_GOOGLE_CLIENT_SECRET');
    const redirect_uri = configService.get('OAUTH2_GOOGLE_REDIRECT_URI');
    if (client_id && secret && redirect_uri) {
      this.envConfig = { client_id, secret, redirect_uri };
    }
    this.publicURL = configService.get('PUBLIC_URL');
  }

  isConfigured(): boolean {
    return !!this.envConfig;
  }

  getStaticOAuth2Config(): OAuth2Config {
    return oauth2Config;
  }

  getScopesToExpectInResponse(): string[] {
    return [...googleOidcScopes, ...googleCalendarScopes];
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
    user.GoogleOAuth2 = { LinkedCalendar: true } as GoogleOAuth2;
  }

  private mergeResultsFromIncrementalSync(
    eventsMap: Record<string, OAuth2CalendarEvent>,
    newItems: GoogleListEventsResponseItem[],
  ) {
    for (const item of newItems) {
      // See https://developers.google.com/calendar/api/v3/reference/events#resource
      if (item.status === 'cancelled') {
        delete eventsMap[item.id];
      } else {
        // update or insert
        eventsMap[item.id] =
          GoogleListEventsResponseItem_to_OAuth2CalendarEvent(item);
      }
    }
  }

  private async getEventsForMeetingUsingIncrementalSync(
    creds: GoogleOAuth2,
    userID: number,
    meetingID: number,
    timeMin: string,
    timeMax: string,
  ): Promise<{
    events: OAuth2CalendarEvent[];
    nextSyncToken: string;
    needToSaveEvents: boolean;
  } | null> {
    const existingEventsData = await this.calendarEventsRepository.findOneBy({
      UserID: userID,
      MeetingID: meetingID,
    });
    if (
      !existingEventsData ||
      existingEventsData.PrevTimeMin !== timeMin ||
      existingEventsData.PrevTimeMax !== timeMax
    ) {
      return null;
    }
    const eventsMap: Record<string, OAuth2CalendarEvent> = {};
    // TODO: maybe it would be better to store the events as a map in the database?
    for (const event of existingEventsData.Events) {
      eventsMap[event.ID] = event;
    }
    const params: Record<string, string> = {
      syncToken: existingEventsData.SyncToken,
    };
    let atLeastOneEventChanged = false;
    let nextSyncToken: string | undefined;
    for (;;) {
      const url =
        GOOGLE_API_CALENDAR_EVENTS_BASE_URL + '?' + encodeQueryParams(params);
      let response: GoogleListEventsResponse | undefined;
      try {
        response =
          await this.oauth2Service.apiRequest<GoogleListEventsResponse>(
            this,
            creds,
            url,
          );
        this.logger.debug(response);
      } catch (err: any) {
        // See https://developers.google.com/calendar/api/guides/sync#full_sync_required_by_server
        if (err instanceof OAuth2ErrorResponseError && err.statusCode === 410) {
          // Full synchronization required
          return null;
        }
        throw err;
      }
      atLeastOneEventChanged =
        atLeastOneEventChanged || response.items.length > 0;
      response.items = filterOutEventsWhichAreOutOfRange(
        response.items,
        timeMin,
        timeMax,
      );
      this.mergeResultsFromIncrementalSync(eventsMap, response.items);
      if (response.nextSyncToken) {
        nextSyncToken = response.nextSyncToken;
        break;
      }
      params.pageToken = response.nextPageToken!;
    }
    return {
      events: Object.values(eventsMap),
      nextSyncToken,
      needToSaveEvents: atLeastOneEventChanged,
    };
  }

  private async getEventsForMeetingUsingFullSync(
    creds: GoogleOAuth2,
    timeMin: string,
    timeMax: string,
  ): Promise<{
    events: OAuth2CalendarEvent[];
    nextSyncToken: string;
  } | null> {
    // Make sure to NOT use orderBy, otherwise a syncToken won't be returned
    const params: Record<string, string> = {
      maxAttendees: '1',
      singleEvents: 'true',
      timeMin,
      timeMax,
    };
    const events: OAuth2CalendarEvent[] = [];
    let nextSyncToken: string | undefined;
    for (;;) {
      const url =
        GOOGLE_API_CALENDAR_EVENTS_BASE_URL + '?' + encodeQueryParams(params);
      const response =
        await this.oauth2Service.apiRequest<GoogleListEventsResponse>(
          this,
          creds,
          url,
        );
      this.logger.debug(response);
      response.items = filterOutEventsWhichAreOutOfRange(
        response.items,
        timeMin,
        timeMax,
      );
      events.push(
        ...response.items.map(
          GoogleListEventsResponseItem_to_OAuth2CalendarEvent,
        ),
      );
      if (response.nextSyncToken) {
        nextSyncToken = response.nextSyncToken;
        break;
      }
      params.pageToken = response.nextPageToken!;
    }
    return { events, nextSyncToken };
  }

  async getEventsForMeeting(
    abstractCreds: AbstractOAuth2,
    meeting: Meeting,
  ): Promise<OAuth2CalendarEvent[]> {
    const creds = abstractCreds as GoogleOAuth2;
    const userID = creds.UserID;
    const tentativeDates = meeting.TentativeDates;
    const minDate = tentativeDates.reduce((a, b) => (a < b ? a : b));
    const maxDate = tentativeDates.reduce((a, b) => (a > b ? a : b));
    const apiTimeMin = toISOStringUTCFromDateStrAndHourAndTz(
      minDate,
      meeting.MinStartHour,
      meeting.Timezone,
    );
    const apiTimeMax = toISOStringUTCFromDateStrAndHourAndTz(
      maxDate,
      meeting.MaxEndHour,
      meeting.Timezone,
    );
    const existingEventsData =
      await this.getEventsForMeetingUsingIncrementalSync(
        creds,
        userID,
        meeting.ID,
        apiTimeMin,
        apiTimeMax,
      );
    let events: OAuth2CalendarEvent[];
    let nextSyncToken: string | null = null;
    let needToSaveEvents = true;
    if (existingEventsData) {
      ({ events, nextSyncToken, needToSaveEvents } = existingEventsData);
    } else {
      const newEventsData = await this.getEventsForMeetingUsingFullSync(
        creds,
        apiTimeMin,
        apiTimeMax,
      );
      ({ events, nextSyncToken } = newEventsData);
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
    const createdEvent = await this.calendarCreatedEventsRepository.findOneBy({
      MeetingID: meeting.ID,
      UserID: userID,
    });
    if (createdEvent) {
      events = events.filter(
        (event) => event.ID !== createdEvent.CreatedGoogleMeetingID,
      );
    }
    return events;
  }

  async createOrUpdateEventForMeeting(
    creds: AbstractOAuth2,
    abstractExistingEvent: AbstractOAuth2CalendarCreatedEvent | null,
    meeting: Meeting,
  ): Promise<void> {
    const existingEvent =
      abstractExistingEvent as GoogleCalendarCreatedEvent | null;
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
      summary: meeting.Name,
      source: {
        url: `${this.publicURL}/m/${meeting.ID}`,
      },
    };
    if (meeting.About) {
      params.description = meeting.About;
    }
    let response: GoogleInsertEventResponse | undefined;
    const body = JSON.stringify(params);
    const headers = { 'content-type': 'application/json' };
    try {
      response = await this.oauth2Service.apiRequest<GoogleInsertEventResponse>(
        this,
        creds,
        apiURL,
        { method: apiMethod, body, headers },
      );
    } catch (err: any) {
      if (existingEvent && errorIsGoogleCalendarEventNoLongerExists(err)) {
        // It's possible that the user deleted the event themselves. Try to create
        // a new one instead.
        response =
          await this.oauth2Service.apiRequest<GoogleInsertEventResponse>(
            this,
            creds,
            GOOGLE_API_CALENDAR_EVENTS_BASE_URL,
            { method: 'POST', body, headers },
          );
      } else {
        throw err;
      }
    }
    await this.calendarCreatedEventsRepository.save({
      MeetingID: meeting.ID,
      UserID: userID,
      CreatedGoogleMeetingID: response.id,
    });
  }

  async deleteEventForMeeting(
    creds: AbstractOAuth2,
    abstractEvent: AbstractOAuth2CalendarCreatedEvent,
  ): Promise<void> {
    const event = abstractEvent as GoogleCalendarCreatedEvent;
    const apiURL = `${GOOGLE_API_CALENDAR_EVENTS_BASE_URL}/${event.CreatedGoogleMeetingID}`;
    try {
      await this.oauth2Service.apiRequest(this, creds, apiURL, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (!errorIsGoogleCalendarEventNoLongerExists(err)) {
        throw err;
      }
    }
    await this.calendarCreatedEventsRepository.delete({
      MeetingID: event.MeetingID,
      UserID: creds.UserID,
    });
  }
}
