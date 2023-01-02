import { URL } from 'url';
import { jest } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import type { MockInterceptor } from 'undici/types/mock-interceptor';
import type { CustomRedirectResponse } from '../src/common-responses';
import type CreateMeetingDto from '../src/meetings/create-meeting.dto';
import type ScheduleMeetingDto from '../src/meetings/schedule-meeting.dto';
import { sleep } from '../src/misc.utils';
import {
  commonAfterAll,
  commonBeforeAll,
  commonBeforeEach,
  createMeeting,
  createPromiseCallbacks,
  createTokenResponse,
  createUser,
  deleteAccount,
  DELETE,
  GET,
  PATCH,
  POST,
  putSelfRespondent,
  removeSelfRespondent,
  scheduleMeeting,
  unscheduleMeeting,
  decodeQueryParams,
} from './e2e-testing-helpers';

// WARNING: do not use jest.mock() because it loads some modules twice,
// causing the `instanceof` operator to *occasionally* fail.
// Also see https://github.com/facebook/jest/issues/9669.
const originalGlobalDispatcher = getGlobalDispatcher();
let mockAgent: MockAgent;

function createMockJsonResponse(data: object): ReturnType<MockInterceptor.MockReplyOptionsCallback<object>> {
  return {
    statusCode: 200,
    responseOptions: {
      headers: {'content-type': 'application/json; charset=UTF-8'},
    },
    data,
  };
}

function interceptGetEventsApi(
  cb: (req: {
    params: Record<string, string>,
    headers: Record<string, string>,
  }) => ReturnType<MockInterceptor.MockReplyOptionsCallback<object>>,
) {
  return mockAgent.get(apiBaseUrl).intercept({
    path: path => path.startsWith(eventsDeltaApiPath + '?'),
    method: 'GET',
  }).reply(({headers, path}) => {
    // +1 is for the '?'
    const params = decodeQueryParams(path.slice(eventsDeltaApiPath.length + 1));
    return cb({params, headers: headers as Record<string, string>});
  });
}

const authzEndpointPrefix = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?';
const apiBaseUrl = 'https://graph.microsoft.com';
const eventsApiPath = '/v1.0/me/events';
const eventsDeltaApiPath = '/v1.0/me/calendarView/delta';
const eventsDeltaApiUrl = `${apiBaseUrl}${eventsDeltaApiPath}`;
const oauth2ApiBaseUrl = 'https://login.microsoftonline.com';
const responseScopes = 'openid profile email https://graph.microsoft.com/Calendars.ReadWrite';
const nonce = 'abcdef';
const mockClientId = 'microsoft_client_id';
const mockAuthzCode = 'microsoft_code';
const mockRedirectUri = 'http://cabbagemeet.internal/redirect/microsoft';

async function signupOrLoginOrLink(reason: 'signup' | 'login' | 'link', app: INestApplication, token?: string): Promise<string> {
  const apiURL = ({
    'signup': '/api/signup-with-microsoft',
    'login': '/api/login-with-microsoft',
    'link': '/api/me/link-microsoft-calendar',
  } as const)[reason];
  const requestBody: Record<string, string> = {post_redirect: '/'};
  if (reason !== 'link') {
    requestBody.nonce = nonce;
  }
  const {body: {redirect}}: {body: CustomRedirectResponse} =
  await POST(apiURL, app, token)
    .send(requestBody)
    .expect(HttpStatus.OK);
  expect(redirect.startsWith(authzEndpointPrefix)).toBe(true);
  const params = Object.fromEntries(new URL(redirect).searchParams.entries());
  const expectedAuthzParams: Record<string, string> = {
    client_id: mockClientId,
    redirect_uri: mockRedirectUri,
    code_challenge: params.code_challenge,
    code_challenge_method: 'S256',
    response_type: 'code',
    response_mode: 'query',
    scope: 'openid profile email offline_access https://graph.microsoft.com/Calendars.ReadWrite',
    state: params.state,
  };
  if (reason !== 'login') {
    expectedAuthzParams.prompt = 'consent';
  }
  expect(params).toEqual(expectedAuthzParams);
  const parsedState = JSON.parse(params.state);
  const expectedState: Record<string, string> = {
    reason,
    postRedirect: '/',
    serverNonce: parsedState.serverNonce,
  };
  if (reason === 'link') {
    expect(parsedState).toHaveProperty('userID');
    expectedState.userID = parsedState.userID;
  } else {
    expectedState.clientNonce = nonce;
  }
  expect(parsedState).toHaveProperty('serverNonce');
  expect(parsedState).toEqual(expectedState);
  return `/redirect/microsoft?code=${mockAuthzCode}&state=${params.state}`;
}

async function setMockHandlerForTokenEndpoint({
  sub, name, email,
  access_token = 'microsoft_access_token',
  refresh_token = 'microsoft_refresh_token',
  scope = responseScopes,
}: {
  sub: string, name: string, email: string,
  access_token?: string, refresh_token?: string | null,
  scope?: string,
}) {
  const mockResponseBody = await createTokenResponse({
    sub, name, email, access_token, refresh_token, scope
  });
  mockAgent.get(oauth2ApiBaseUrl).intercept({
    path: '/consumers/oauth2/v2.0/token',
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: (body) => {
      const bodyParams = Object.fromEntries(new URLSearchParams(body));
      expect(bodyParams).toHaveProperty('code_verifier');
      expect(bodyParams).toHaveProperty('client_assertion');
      expect(bodyParams).toEqual({
        client_id: mockClientId,
        redirect_uri: mockRedirectUri,
        code_verifier: bodyParams.code_verifier,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: bodyParams.client_assertion,
        code: mockAuthzCode,
        grant_type: 'authorization_code',
      });
      return true;
    },
  }).reply(200, mockResponseBody);
}

let testUserCounter = 1;
async function signupNewUserWithMicrosoft(
  {sub, name, email}: {sub?: string, name?: string, email?: string},
  app: INestApplication,
): Promise<{sub: string, name: string, email: string, token: string}> {
  sub ??= `microsoft_test_sub${testUserCounter}`;
  name ??= `microsoft_test${testUserCounter}`;
  email ??= `microsoft_test${testUserCounter}@outlook.com`;
  testUserCounter++;
  const redirect = await signupOrLoginOrLink('signup', app);
  await setMockHandlerForTokenEndpoint({sub, name, email});
  const redirect2 = (
    await GET(redirect, app).expect(HttpStatus.FOUND)
  ).headers.location as string;
  expect(redirect2.startsWith('http://cabbagemeet.internal/?')).toBe(true);
  const redirect2Params = decodeQueryParams(redirect2.slice('http://cabbagemeet.internal/?'.length));
  expect(redirect2Params).toEqual({
    token: redirect2Params.token,
    nonce,
  });
  return {token: redirect2Params.token, sub, name, email};
}

async function waitUntilCreatedEventIsSavedInDB(eventID: string, expectedNumber: number, app: INestApplication) {
  const datasource = app.get(DataSource);
  for (let i = 0; i < 20; i++) {
    const rows = await datasource.query(
      `SELECT 1 FROM MicrosoftCalendarCreatedEvent WHERE CreatedEventID = '${eventID}'`
    );
    if (rows.length === expectedNumber) {
      return;
    }
    await sleep(50);
  }
  throw new Error('timed out waiting for created event to get saved to DB');
}

describe('OAuth2Controller (e2e) (Microsoft)', () => {
  let app: NestExpressApplication;
  let token1: string;
  const mockSub1 = '000001';
  const mockEmail1 = 'test1@outlook.com';
  const mockName1 = 'Test 1';

  const sampleCreateMeetingDto: CreateMeetingDto = {
    name: 'My meeting',
    timezone: 'America/New_York',
    minStartHour: 10,
    maxEndHour: 16,
    tentativeDates: ['2022-12-21', '2022-12-22', '2022-12-24'],
  };
  Object.freeze(sampleCreateMeetingDto);
  const sampleSchedule: ScheduleMeetingDto = {
    startDateTime: '2022-12-22T02:00:00Z',
    endDateTime: '2022-12-22T05:00:00Z',
  };
  Object.freeze(sampleSchedule);

  beforeAll(async () => {
    app = await commonBeforeAll({
      VERIFY_SIGNUP_EMAIL_ADDRESS: 'false',
      OAUTH2_MICROSOFT_CLIENT_ID: mockClientId,
      OAUTH2_MICROSOFT_CERTIFICATE_PATH: 'test/microsoft-test.crt',
      OAUTH2_MICROSOFT_PRIVATE_KEY_PATH: 'test/microsoft-test.key',
      OAUTH2_MICROSOFT_REDIRECT_URI: mockRedirectUri,
    });
  });
  beforeEach(commonBeforeEach);

  beforeEach(() => {
    // See https://undici.nodejs.org/#/docs/best-practices/mocking-request
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });
  afterEach(async () => {
    if (mockAgent) {
      await mockAgent.close();
    }
  });
  afterAll(() => {
    setGlobalDispatcher(originalGlobalDispatcher);
  });

  afterAll(() => commonAfterAll(app));

  it('/api/signup-with-microsoft (POST)', async () => {
    ({token: token1} = await signupNewUserWithMicrosoft({sub: mockSub1, name: mockName1, email: mockEmail1}, app));
    const {body: meBody} = await GET('/api/me', app, token1)
      .expect(HttpStatus.OK);
    expect(meBody).toEqual({
      userID: meBody.userID,
      name: mockName1,
      email: mockEmail1,
      isSubscribedToNotifications: false,
      hasLinkedGoogleAccount: false,
      hasLinkedMicrosoftAccount: true,
    });
  });

  it('/api/signup-with-microsoft (POST) (account already exists)', async () => {
    expect(token1).toBeDefined();
    const redirect = await signupOrLoginOrLink('signup', app);
    await setMockHandlerForTokenEndpoint({sub: mockSub1, name: mockName1, email: mockEmail1});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2).toStrictEqual('http://cabbagemeet.internal/error?e=E_OAUTH2_ACCOUNT_ALREADY_LINKED&provider=MICROSOFT');
  });

  it('/api/signup-with-microsoft (POST) (not all scopes granted)', async () => {
    const redirect = await signupOrLoginOrLink('signup', app);
    await setMockHandlerForTokenEndpoint({
      sub: '000002', name: 'test2', email: 'test2@outlook.com',
      // missing Calendar API scope
      scope: 'openid profile email',
    });
    const {headers} = await GET(redirect, app).expect(HttpStatus.FOUND);
    const redirect2 = headers['location'] as string;
    expect(redirect2).toStrictEqual('http://cabbagemeet.internal/error?e=E_OAUTH2_NOT_ALL_SCOPES_GRANTED&provider=MICROSOFT');
  });

  it('/api/login-with-microsoft (POST) (user exists, not linked yet, refresh token is present)', async () => {
    const {name, email} = await createUser(app);
    const redirect = await signupOrLoginOrLink('login', app);
    await setMockHandlerForTokenEndpoint({sub: '000006', name: 'Pseudonym', email});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to link confirmation page
    expect(redirect2.startsWith('http://cabbagemeet.internal/confirm-link-microsoft-account?')).toBe(true);
    const redirect2Params = decodeQueryParams(redirect2.slice('http://cabbagemeet.internal/confirm-link-microsoft-account?'.length));
    const {token} = redirect2Params;
    expect(redirect2Params).toEqual({
      postRedirect: '/',
      token,
      encryptedEntity: redirect2Params.encryptedEntity,
      iv: redirect2Params.iv,
      salt: redirect2Params.salt,
      tag: redirect2Params.tag,
      nonce,
    });
    const {body: user} = await POST('/api/confirm-link-microsoft-account', app, token)
      .send({
        encrypted_entity: redirect2Params.encryptedEntity,
        iv: redirect2Params.iv,
        salt: redirect2Params.salt,
        tag: redirect2Params.tag,
      })
      .expect(HttpStatus.OK);
    expect(user).toEqual({
      userID: user.userID,
      name,  // original name should be kept
      email,
      isSubscribedToNotifications: false,
      hasLinkedGoogleAccount: false,
      hasLinkedMicrosoftAccount: true,
    });
    await deleteAccount(app, token);
  });

  it('/api/me/link-microsoft-calendar (POST) (refresh token is present)', async () => {
    const {name, email, token} = await createUser(app);
    const redirect = await signupOrLoginOrLink('link', app, token);
    await setMockHandlerForTokenEndpoint({sub: '000009', name, email});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2).toStrictEqual('http://cabbagemeet.internal/');
    const {body: user} = await GET('/api/me', app, token).expect(HttpStatus.OK);
    expect(user.hasLinkedMicrosoftAccount).toBe(true);
    await deleteAccount(app, token);
  });

  it('/api/me/microsoft-calendar-events (GET)', async () => {
    const {token} = await signupNewUserWithMicrosoft({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const fullSyncParams = {
      $select: 'id,subject,start,end,isCancelled',
      startDateTime: '2022-12-21T15:00:00Z',
      endDateTime: '2022-12-24T21:00:00Z',
    };
    // Full sync, one page
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual(fullSyncParams);
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token`,
        value: [
          {
            id: 'microsoft_event_1',
            isCancelled: false,
            subject: 'Microsoft Event 1',
            start: {
              dateTime: '2022-12-21T11:00:00.000000',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T11:30:00.000000',
              timeZone: 'America/New_York',
            },
          },
          {
            id: 'microsoft_event_2',
            isCancelled: false,
            subject: 'Microsoft Event 2',
            start: {
              dateTime: '2022-12-25T04:30:00.000000',
              timeZone: 'Asia/Shanghai',
            },
            end: {
              dateTime: '2022-12-25T05:30:00.000000',
              timeZone: 'Asia/Shanghai',
            },
          }
        ],
      });
    });
    const expectedResponse = {
      events: [
        {
          summary: 'Microsoft Event 1',
          startDateTime: '2022-12-21T16:00:00Z',
          endDateTime: '2022-12-21T16:30:00Z',
        },
        {
          summary: 'Microsoft Event 2',
          startDateTime: '2022-12-24T20:30:00Z',
          endDateTime: '2022-12-24T21:30:00Z',
        },
      ]
    };
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, no changes
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual({'$deltatoken': 'microsoft_sync_token'});
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token`,
        value: [],
      });
    });
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, one event removed, one event modified, one event added
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual({'$deltatoken': 'microsoft_sync_token'});
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token_2`,
        value: [
          {
            id: 'microsoft_event_2',
            '@removed': {
              reason: 'deleted',
            },
          },
          {
            id: 'microsoft_event_1',
            isCancelled: false,
            subject: 'Microsoft Event 1',
            start: {
              dateTime: '2022-12-21T13:00:00.000000',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T13:30:00.000000',
              timeZone: 'America/New_York',
            },
          },
          {
            id: 'microsoft_event_3',
            isCancelled: false,
            subject: 'Microsoft Event 3',
            start: {
              dateTime: '2022-12-21T09:40:00.000000',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T10:20:00.000000',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    });
    expectedResponse.events = [
      // Must be sorted by start date
      {
        summary: 'Microsoft Event 3',
        startDateTime: '2022-12-21T14:40:00Z',
        endDateTime: '2022-12-21T15:20:00Z',
      },
      {
        summary: 'Microsoft Event 1',
        startDateTime: '2022-12-21T18:00:00Z',
        endDateTime: '2022-12-21T18:30:00Z',
      },
    ];
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, two events deleted, one event added, split over multiple pages
    interceptGetEventsApi(({params}) => {
      if (!params.hasOwnProperty('$skiptoken')) {
        expect(params).toEqual({'$deltatoken': 'microsoft_sync_token_2'});
        return createMockJsonResponse({
          '@odata.nextLink': `${eventsDeltaApiUrl}?$skiptoken=microsoft_page_token`,
          value: [
            {
              id: 'microsoft_event_1',
              isCancelled: true,
            },
            {
              id: 'microsoft_event_3',
              '@removed': {
                reason: 'deleted',
              },
            },
            // Some random event which we're not interested in (can actually happen)
            {
              id: 'microsoft_event_100',
              '@removed': {
                reason: 'deleted',
              },
            },
          ],
        });
      }
      expect(params).toEqual({'$skiptoken': 'microsoft_page_token'});
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token_3`,
        value: [
          {
            id: 'microsoft_event_4',
            isCancelled: false,
            subject: 'Microsoft Event 4',
            start: {
              dateTime: '2022-12-21T23:00:00.000000',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T23:30:00.000000',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    }).times(2);
    expectedResponse.events = [
      {
        summary: 'Microsoft Event 4',
        startDateTime: '2022-12-22T04:00:00Z',
        endDateTime: '2022-12-22T04:30:00Z',
      },
    ];
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Force a full sync, split over multiple pages
    interceptGetEventsApi(({params}) => {
      if (params['$deltatoken'] === 'microsoft_sync_token_3') {
        return {
          statusCode: 410,
          data: '',
        };
      }
      if (!params.hasOwnProperty('$skiptoken')) {
        expect(params).toEqual(fullSyncParams);
        return createMockJsonResponse({
          '@odata.nextLink': `${eventsDeltaApiUrl}?$skiptoken=microsoft_page_token_2`,
          value: [
            {
              id: 'microsoft_event_5',
              isCancelled: false,
              subject: 'Microsoft Event 5',
              start: {
                dateTime: '2022-12-21T22:00:00.000000',
                timeZone: 'America/New_York',
              },
              end: {
                dateTime: '2022-12-22T00:00:00.000000',
                timeZone: 'America/New_York',
              },
            },
          ],
        });
      }
      expect(params).toEqual({'$skiptoken': 'microsoft_page_token_2'});
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token_4`,
        value: [
          {
            id: 'microsoft_event_6',
            status: 'confirmed',
            subject: 'Microsoft Event 6',
            start: {
              dateTime: '2022-12-21T22:30:00.000000',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T23:00:00.000000',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    }).times(3);
    expectedResponse.events = [
      // Event 4 should have been dropped
      {
        summary: 'Microsoft Event 5',
        startDateTime: '2022-12-22T03:00:00Z',
        endDateTime: '2022-12-22T05:00:00Z',
      },
      {
        summary: 'Microsoft Event 6',
        startDateTime: '2022-12-22T03:30:00Z',
        endDateTime: '2022-12-22T04:00:00Z',
      },
    ];
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, no changes
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual({'$deltatoken': 'microsoft_sync_token_4'});
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token_4`,
        value: [],
      });
    });
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await deleteAccount(app, token);
  });

  it('/api/me/microsoft-calendar-events (GET) (meeting changes)', async () => {
    const {token} = await signupNewUserWithMicrosoft({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, token);
    const fullSyncParams = {
      $select: 'id,subject,start,end,isCancelled',
      startDateTime: '2022-12-21T15:00:00Z',
      endDateTime: '2022-12-24T21:00:00Z',
    };
    // Full sync, one page
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual(fullSyncParams);
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token`,
        value: [
          {
            id: 'microsoft_event_1',
            isCancelled: false,
            subject: 'Microsoft Event 1',
            start: {
              dateTime: '2022-12-21T12:00:00.000000',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T12:30:00.000000',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    }).persist();
    const expectedResponse = {
      events: [
        {
          summary: 'Microsoft Event 1',
          startDateTime: '2022-12-21T17:00:00Z',
          endDateTime: '2022-12-21T17:30:00Z',
        },
      ]
    };
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Changing the start hour, end hour or timezone should trigger a full sync
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({minStartHour: 9})
      .expect(HttpStatus.OK);
    fullSyncParams.startDateTime = '2022-12-21T14:00:00Z';
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({maxEndHour: 17})
      .expect(HttpStatus.OK);
    fullSyncParams.endDateTime = '2022-12-24T22:00:00Z';
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({timezone: 'America/Los_Angeles'})
      .expect(HttpStatus.OK);
    fullSyncParams.startDateTime = '2022-12-21T17:00:00Z';
    fullSyncParams.endDateTime = '2022-12-25T01:00:00Z';
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await deleteAccount(app, token);
  });

  it('/api/me/microsoft-calendar-events (GET) (refresh token)', async () => {
    const {sub, name, email, token} = await signupNewUserWithMicrosoft({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, token);
    const mockResponseBody = await createTokenResponse({
      sub, name, email,
      access_token: 'microsoft_access_token_2',
      scope: responseScopes,
    });
    mockAgent.get(oauth2ApiBaseUrl).intercept({
      path: '/consumers/oauth2/v2.0/token',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    }).reply(({body}) => {
      const params = Object.fromEntries(new URLSearchParams(body as string).entries());
      expect(params.grant_type).toStrictEqual('refresh_token');
      expect(params.refresh_token).toStrictEqual('microsoft_refresh_token');
      return createMockJsonResponse(mockResponseBody);
    });
    interceptGetEventsApi(({headers}) => {
      expect(headers).toEqual({
        authorization: 'Bearer microsoft_access_token_2',
      });
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token`,
        value: [],
      });
    });
    const now = Date.now();  // milliseconds
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => now + 3_600_000);  // add 1 hour
    try {
      await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token)
        .expect(HttpStatus.OK)
        .expect({events: []});
    } finally {
      Date.now = originalDateNow;
    }
    await deleteAccount(app, token);
  });

  it('/api/meetings/:id/schedule (PUT|DELETE) (create/update/delete events)', async () => {
    const {token: token1} = await signupNewUserWithMicrosoft({}, app);
    const {token: token2} = await signupNewUserWithMicrosoft({}, app);
    const createMeetingDto = {...sampleCreateMeetingDto};
    const {meetingID} = await createMeeting(createMeetingDto, app);
    await putSelfRespondent({availabilities: []}, meetingID, app, token1);
    await putSelfRespondent({availabilities: []}, meetingID, app, token2);
    const schedule = {...sampleSchedule};
    // Scheduling a meeting should create an event for each respondent with
    // a linked account
    const setMockHandlerForCreatingOrUpdatingEvent = (expectedTimes: number, isUpdate: boolean = false) => {
      const [createEventPromise, createEventResolve, createEventReject] = createPromiseCallbacks();
      let numEventsCreated = 0;
      mockAgent.get(apiBaseUrl).intercept({
        path: isUpdate ? `${eventsApiPath}/microsoft_event_1` : eventsApiPath,
        method: isUpdate ? 'PATCH' : 'POST',
      }).reply(({headers, body}) => {
        try {
          expect(headers).toEqual({
            authorization: 'Bearer microsoft_access_token',
            'content-type': 'application/json',
          });
          expect(JSON.parse(body as string)).toEqual({
            subject: createMeetingDto.name,
            body: {
              content: `http://cabbagemeet.internal/m/${meetingID}`,
              contentType: 'text',
            },
            bodyPreview: `http://cabbagemeet.internal/m/${meetingID}`,
            start: {
              dateTime: schedule.startDateTime,
              timeZone: 'UTC',
            },
            end: {
              dateTime: schedule.endDateTime,
              timeZone: 'UTC',
            },
          });
        } catch (err) {
          createEventReject(err);
          return;
        }
        if (++numEventsCreated === expectedTimes) {
          // The server saves the event to the database AFTER it makes the
          // request to the Microsoft API. So we need to wait until the DB is
          // updated.
          // TODO: figure out a better way to do this
          (async () => {
            try {
              await waitUntilCreatedEventIsSavedInDB('microsoft_event_1', expectedTimes, app);
              createEventResolve(null);
            } catch (err) {
              createEventReject(err);
            }
          })();
        }
        return createMockJsonResponse({
          id: 'microsoft_event_1',
        });
      }).times(expectedTimes);
      return createEventPromise;
    };
    let createEventPromise = setMockHandlerForCreatingOrUpdatingEvent(2);
    await scheduleMeeting(meetingID, schedule, app);
    await createEventPromise;

    const setMockHandlerForDeletingEvent = (expectedTimes: number) => {
      const [deleteEventPromise, deleteEventResolve, deleteEventReject] = createPromiseCallbacks();
      let numEventsDeleted = 0;
      mockAgent.get(apiBaseUrl).intercept({
        method: 'DELETE',
        path: `${eventsApiPath}/microsoft_event_1`,
      }).reply(() => {
        try {
          expect(numEventsDeleted).toBeLessThan(expectedTimes);
        } catch (err) {
          deleteEventReject(err);
          return;
        }
        if (++numEventsDeleted === expectedTimes) {
          deleteEventResolve(null);
        }
        return {
          statusCode: 204,
          body: '',
        };
      }).times(expectedTimes);
      return deleteEventPromise;
    };

    // Removing your availabilities from a scheduled meeting should delete
    // the event from your calendar
    let deleteEventPromise = setMockHandlerForDeletingEvent(1);
    await removeSelfRespondent(meetingID, app, token2);
    await deleteEventPromise;

    // Adding your availabilities to a scheduled meeting should create
    // a new event
    createEventPromise = setMockHandlerForCreatingOrUpdatingEvent(1);
    await putSelfRespondent({availabilities: []}, meetingID, app, token2);
    await createEventPromise;

    // Modifying a scheduled event should update the events for each
    // respondent with a linked calendar
    createMeetingDto.name = 'A new name';
    createEventPromise = setMockHandlerForCreatingOrUpdatingEvent(2, true);
    await PATCH('/api/meetings/' + meetingID, app, token1)
      .send({name: createMeetingDto.name})
      .expect(HttpStatus.OK);
    await createEventPromise;

    // Re-scheduling the meeting should update the events too
    schedule.startDateTime = '2022-12-22T02:30:00Z';
    createEventPromise = setMockHandlerForCreatingOrUpdatingEvent(2, true);
    await scheduleMeeting(meetingID, schedule, app);
    await createEventPromise;

    // Created events should be filtered out
    interceptGetEventsApi(() => {
      return createMockJsonResponse({
        '@odata.deltaLink': `${eventsDeltaApiUrl}?$deltatoken=microsoft_sync_token`,
        value: [
          {
            id: 'microsoft_event_1',
            isCancelled: false,
            subject: 'Microsoft Event 1',
            start: {
              dateTime: schedule.startDateTime.slice(0, schedule.startDateTime.length - 1) + '.000000',
              timeZone: 'UTC',
            },
            end: {
              dateTime: schedule.endDateTime.slice(0, schedule.endDateTime.length - 1) + '.000000',
              timeZone: 'UTC',
            },
          },
        ],
      });
    });
    await GET(`/api/me/microsoft-calendar-events?meetingID=${meetingID}`, app, token1)
      .expect(HttpStatus.OK)
      .expect({events: []});

    // Unscheduling a meeting should delete the event for each respondent
    // with a linked account
    deleteEventPromise = setMockHandlerForDeletingEvent(2);
    await unscheduleMeeting(meetingID, app);
    await deleteEventPromise;

    // Deleting a meeting should also delete the events created for it
    createEventPromise = setMockHandlerForCreatingOrUpdatingEvent(2);
    await scheduleMeeting(meetingID, schedule, app);
    await createEventPromise;
    deleteEventPromise = setMockHandlerForDeletingEvent(2);
    await DELETE('/api/meetings/' + meetingID, app, token1).expect(HttpStatus.NO_CONTENT);
    await deleteEventPromise;

    await deleteAccount(app, token1);
    await deleteAccount(app, token2);
  });

});
