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
import OAuth2Service from '../src/oauth2/oauth2.service';
import {
  commonAfterAll,
  commonBeforeAll,
  commonBeforeEach,
  createMeeting,
  createPromiseCallbacks,
  createTokenResponse,
  createUser,
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
    path: path => path.startsWith(eventsApiPath + '?'),
    method: 'GET',
  }).reply(({headers, path}) => {
    // +1 is for the '?'
    const params = decodeQueryParams(path.slice(eventsApiPath.length + 1));
    return cb({params, headers: headers as Record<string, string>});
  });
}

const authzEndpointPrefix = 'https://accounts.google.com/o/oauth2/v2/auth?';
const apiBaseUrl = 'https://www.googleapis.com';
const eventsApiPath = '/calendar/v3/calendars/primary/events';
const oauth2ApiBaseUrl = 'https://oauth2.googleapis.com';
const responseScopes = 'openid https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const nonce = 'abcdef';
const mockClientId = 'google_client_id';
const mockClientSecret = 'google_client_secret';
const mockAuthzCode = 'google_code';
const mockRedirectUri = 'http://cabbagemeet.internal/redirect/google';
const GONE_error = {
  error: {
    errors: [
      {
        domain: "global",
        reason: "deleted",
        message: "Resource has been deleted"
      }
    ],
    code: 410,
    message: "Resource has been deleted",
  },
};

async function signupOrLoginOrLink(reason: 'signup' | 'login' | 'link', app: INestApplication, token?: string): Promise<string> {
  const apiURL = ({
    'signup': '/api/signup-with-google',
    'login': '/api/login-with-google',
    'link': '/api/me/link-google-calendar',
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
    access_type: 'offline',
    response_type: 'code',
    response_mode: 'query',
    scope: 'openid profile email https://www.googleapis.com/auth/calendar.events.owned',
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
  };
  if (reason === 'link') {
    expect(parsedState).toHaveProperty('userID');
    expectedState.userID = parsedState.userID;
  } else {
    expectedState.clientNonce = nonce;
  }
  expect(parsedState).toEqual(expectedState);
  return `/redirect/google?code=${mockAuthzCode}&state=${params.state}`;
}

async function setMockHandlerForTokenEndpoint({
  sub, name, email,
  access_token = 'google_access_token',
  refresh_token = 'google_refresh_token',
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
    path: '/token',
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: (body) => {
      // Use `expect` instead of an actual matcher so that we get a nicer
      // error message if a test fails
      expect(Object.fromEntries(new URLSearchParams(body))).toEqual({
        client_id: mockClientId,
        redirect_uri: mockRedirectUri,
        client_secret: mockClientSecret,
        code: mockAuthzCode,
        grant_type: 'authorization_code',
      });
      return true;
    },
  }).reply(200, mockResponseBody);
}

function setMockHandlerForRevokeEndpoint(
  {
    refresh_token = 'google_refresh_token',
  }: {
    refresh_token?: string,
  },
  cb?: () => void,
) {
  mockAgent.get(oauth2ApiBaseUrl).intercept({
    path: '/revoke',
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: (body) => {
      expect(Object.fromEntries(new URLSearchParams(body))).toEqual({
        token: refresh_token,
      });
      return true;
    },
  }).reply(204, () => {
    if (cb) cb();
    return '';
  });
}

async function deleteAccountAndExpectTokenToBeRevoked(app: INestApplication, token: string) {
  let tokenWasRevoked = false;
  setMockHandlerForRevokeEndpoint({}, () => { tokenWasRevoked = true; });
  await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
  expect(tokenWasRevoked).toBe(true);
}

async function unlinkAccountAndExpectTokenToBeRevoked(app: INestApplication, token: string) {
  let tokenWasRevoked = false;
  setMockHandlerForRevokeEndpoint({}, () => { tokenWasRevoked = true; });
  const {body: user} = await DELETE('/api/me/link-google-calendar', app, token)
    .expect(HttpStatus.OK);
  expect(tokenWasRevoked).toBe(true);
  expect(user.hasLinkedGoogleAccount).toBe(false);
}

let testUserCounter = 1;
async function signupNewUserWithGoogle(
  {sub, name, email}: {sub?: string, name?: string, email?: string},
  app: INestApplication,
): Promise<{sub: string, name: string, email: string, token: string}> {
  sub ??= `google_test_sub${testUserCounter}`;
  name ??= `google_test${testUserCounter}`;
  email ??= `google_test${testUserCounter}@gmail.com`;
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

// This is leaking implementation details, but I can't think of another way
// to make sure that the event is saved, since we don't expose it via an API...
async function waitUntilCreatedEventIsSavedInDB(eventID: string, expectedNumber: number, app: INestApplication) {
  const datasource = app.get(DataSource);
  for (let i = 0; i < 20; i++) {
    const rows = await datasource.query(
      `SELECT 1 FROM GoogleCalendarCreatedEvent WHERE CreatedEventID = '${eventID}'`
    );
    if (rows.length === expectedNumber) {
      return;
    }
    await sleep(50);
  }
  throw new Error('timed out waiting for created event to get saved to DB');
}

describe('OAuth2Controller (e2e) (Google)', () => {
  let app: NestExpressApplication;
  let token1: string;
  const mockSub1 = '000001';
  const mockEmail1 = 'test1@gmail.com';
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
      OAUTH2_GOOGLE_CLIENT_ID: mockClientId,
      OAUTH2_GOOGLE_CLIENT_SECRET: mockClientSecret,
      OAUTH2_GOOGLE_REDIRECT_URI: mockRedirectUri,
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

  it('/api/signup-with-google (POST)', async () => {
    ({token: token1} = await signupNewUserWithGoogle({sub: mockSub1, name: mockName1, email: mockEmail1}, app));
    const {body: meBody} = await GET('/api/me', app, token1)
      .expect(HttpStatus.OK);
    expect(meBody).toEqual({
      userID: meBody.userID,
      name: mockName1,
      email: mockEmail1,
      isSubscribedToNotifications: false,
      hasLinkedGoogleAccount: true,
      hasLinkedMicrosoftAccount: false,
    });
  });

  it('/api/signup-with-google (POST) (account already exists)', async () => {
    expect(token1).toBeDefined();
    const redirect = await signupOrLoginOrLink('signup', app);
    await setMockHandlerForTokenEndpoint({sub: mockSub1, name: mockName1, email: mockEmail1});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2).toStrictEqual('http://cabbagemeet.internal/error?e=E_OAUTH2_ACCOUNT_ALREADY_LINKED&provider=GOOGLE');
  });

  it('/api/signup-with-google (POST) (not all scopes granted)', async () => {
    const redirect = await signupOrLoginOrLink('signup', app);
    await setMockHandlerForTokenEndpoint({
      sub: '000002', name: 'test2', email: 'test2@gmail.com',
      // missing Calendar API scope
      scope: 'openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    });
    const {headers} = await GET(redirect, app).expect(HttpStatus.FOUND);
    const redirect2 = headers['location'] as string;
    expect(redirect2).toStrictEqual('http://cabbagemeet.internal/error?e=E_OAUTH2_NOT_ALL_SCOPES_GRANTED&provider=GOOGLE');
  });

  it('/api/login-with-google (POST) (user does not exist, no refresh token)', async () => {
    const redirect = await signupOrLoginOrLink('login', app);
    await setMockHandlerForTokenEndpoint({
      sub: '000003', name: 'test3', email: 'test3@gmail.com',
      refresh_token: null,
    });
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to consent page
    expect(redirect2.startsWith(authzEndpointPrefix)).toBe(true);
    const params = Object.fromEntries(new URL(redirect2).searchParams.entries());
    expect(params.prompt).toStrictEqual('consent');
    await setMockHandlerForTokenEndpoint({sub: '000003', name: 'test3', email: 'test3@gmail.com'});
    const redirect3 = (
      await GET(`/redirect/google?code=${mockAuthzCode}&state=${params.state}`, app)
        .expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect3.startsWith('http://cabbagemeet.internal/?'));
    const redirect3Params = decodeQueryParams(redirect3.slice('http://cabbagemeet.internal/?'.length));
    expect(redirect3Params).toEqual({
      token: redirect3Params.token,
      nonce,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, redirect3Params.token);
  });

  it('/api/login-with-google (POST) (user does not exist, refresh token is present)', async () => {
    const redirect = await signupOrLoginOrLink('login', app);
    await setMockHandlerForTokenEndpoint({sub: '000004', name: 'test4', email: 'test4@gmail.com'});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2.startsWith('http://cabbagemeet.internal/?')).toBe(true);
    const redirect2Params = decodeQueryParams(redirect2.slice('http://cabbagemeet.internal/?'.length));
    expect(redirect2Params).toEqual({
      token: redirect2Params.token,
      nonce,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, redirect2Params.token);
  });

  it('/api/login-with-google (POST) (user exists, not linked yet, no refresh token)', async () => {
    const {token, name, email} = await createUser(app);
    const redirect = await signupOrLoginOrLink('login', app);
    await setMockHandlerForTokenEndpoint({
      sub: '000005', name, email,
      refresh_token: null,
    });
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to consent page
    expect(redirect2.startsWith(authzEndpointPrefix)).toBe(true);
    const params = Object.fromEntries(new URL(redirect2).searchParams.entries());
    expect(params.prompt).toStrictEqual('consent');
    await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
  });

  it('/api/login-with-google (POST) (user exists, not linked yet, refresh token is present)', async () => {
    const {name, email} = await createUser(app);
    const redirect = await signupOrLoginOrLink('login', app);
    await setMockHandlerForTokenEndpoint({sub: '000006', name: 'Pseudonym', email});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to link confirmation page
    expect(redirect2.startsWith('http://cabbagemeet.internal/confirm-link-google-account?')).toBe(true);
    const redirect2Params = decodeQueryParams(redirect2.slice('http://cabbagemeet.internal/confirm-link-google-account?'.length));
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
    const {body: user} = await POST('/api/confirm-link-google-account', app, token)
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
      hasLinkedGoogleAccount: true,
      hasLinkedMicrosoftAccount: false,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/login-with-google (POST) (user exists, already linked)', async () => {
    const {sub, name, email} = await signupNewUserWithGoogle({}, app);
    const redirect = await signupOrLoginOrLink('login', app);
    await setMockHandlerForTokenEndpoint({
      sub, name, email,
      // refresh token is not present in Google OIDC responses if the user
      // already granted consent
      refresh_token: null,
    });
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2.startsWith('http://cabbagemeet.internal/?')).toBe(true);
    const redirect2Params = decodeQueryParams(redirect2.slice('http://cabbagemeet.internal/?'.length));
    expect(redirect2Params).toEqual({
      token: redirect2Params.token,
      nonce,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, redirect2Params.token);
  });

  it('/api/me/link-google-calendar (POST) (no refresh token)', async () => {
    const {name, email, token} = await createUser(app);
    const redirect = await signupOrLoginOrLink('link', app, token);
    await setMockHandlerForTokenEndpoint({
      sub: '000008', name, email, refresh_token: null,
    });
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to consent page
    expect(redirect2.startsWith(authzEndpointPrefix)).toBe(true);
    const params = Object.fromEntries(new URL(redirect2).searchParams.entries());
    expect(params.prompt).toStrictEqual('consent');
    await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
  });

  it('/api/me/link-google-calendar (POST) (refresh token is present)', async () => {
    const {name, email, token} = await createUser(app);
    const redirect = await signupOrLoginOrLink('link', app, token);
    await setMockHandlerForTokenEndpoint({sub: '000009', name, email});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2).toStrictEqual('http://cabbagemeet.internal/');
    const {body: user} = await GET('/api/me', app, token).expect(HttpStatus.OK);
    expect(user.hasLinkedGoogleAccount).toBe(true);
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/me/link-google-calendar (DELETE) (signed up with email)', async () => {
    const {name, email, token} = await createUser(app);
    const redirect = await signupOrLoginOrLink('link', app, token);
    await setMockHandlerForTokenEndpoint({sub: '000010', name, email});
    await GET(redirect, app).expect(HttpStatus.FOUND);
    await unlinkAccountAndExpectTokenToBeRevoked(app, token);
    await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
  });

  it('/api/me/link-google-calendar (DELETE) (signed up with Google)', async () => {
    const {token} = await signupNewUserWithGoogle({}, app);
    // token should not be revoked because user signed up with Google
    const {body: user} = await DELETE('/api/me/link-google-calendar', app, token)
      .expect(HttpStatus.OK);
    expect(user.hasLinkedGoogleAccount).toBe(false);
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/redirect/google (GET) (error or invalid)', async () => {
    const expectBadRequest = async (url: string) => {
      await GET(url, app).expect(HttpStatus.BAD_REQUEST);
    };
    await expectBadRequest('/redirect/google?code=google_code');
    await expectBadRequest('/redirect/google?state=abc');
    await expectBadRequest(`/redirect/google?state=${encodeURIComponent('{}')}`);
    await expectBadRequest(`/redirect/google?state=${encodeURIComponent(JSON.stringify({
      reason: 'signup',
      postRedirect: '/',
      clientNonce: nonce,
    }))}`);
    const redirect = (
      await GET(`/redirect/google?error=${encodeURIComponent('some error')}`, app)
        .expect(HttpStatus.FOUND)
    ).headers.location;
    expect(redirect).toStrictEqual('http://cabbagemeet.internal/error?e=E_INTERNAL_SERVER_ERROR');
  });

  it('/api/me/google-calendar-events (GET)', async () => {
    const {token} = await signupNewUserWithGoogle({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const fullSyncParams = {
      maxAttendees: '1',
      singleEvents: 'true',
      timeMin: '2022-12-21T15:00:00Z',
      timeMax: '2022-12-24T21:00:00Z',
    };
    // Full sync, one page
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual(fullSyncParams);
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token',
        items: [
          {
            id: 'google_event_1',
            status: 'confirmed',
            summary: 'Google Event 1',
            start: {
              dateTime: '2022-12-21T11:00:00-05:00',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T11:30:00-05:00',
              timeZone: 'America/New_York',
            },
          },
          {
            id: 'google_event_2',
            status: 'confirmed',
            summary: 'Google Event 2',
            start: {
              dateTime: '2022-12-25T04:30:00+08:00',
              timeZone: 'Asia/Shanghai',
            },
            end: {
              dateTime: '2022-12-25T05:30:00+08:00',
              timeZone: 'Asia/Shanghai',
            },
          }
        ],
      });
    });
    const expectedResponse = {
      events: [
        {
          summary: 'Google Event 1',
          startDateTime: '2022-12-21T16:00:00Z',
          endDateTime: '2022-12-21T16:30:00Z',
        },
        {
          summary: 'Google Event 2',
          startDateTime: '2022-12-24T20:30:00Z',
          endDateTime: '2022-12-24T21:30:00Z',
        },
      ]
    };
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, no changes
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual({syncToken: 'google_sync_token'});
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token',
        items: [],
      });
    });
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, one event removed, one event modified, one event added
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual({syncToken: 'google_sync_token'});
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token_2',
        items: [
          {
            id: 'google_event_2',
            status: 'cancelled',
          },
          {
            id: 'google_event_1',
            status: 'confirmed',
            summary: 'Google Event 1',
            start: {
              dateTime: '2022-12-21T13:00:00-05:00',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T13:30:00-05:00',
              timeZone: 'America/New_York',
            },
          },
          {
            id: 'google_event_3',
            status: 'confirmed',
            summary: 'Google Event 3',
            start: {
              dateTime: '2022-12-21T09:40:00-05:00',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T10:20:00-05:00',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    });
    expectedResponse.events = [
      // Must be sorted by start date
      {
        summary: 'Google Event 3',
        startDateTime: '2022-12-21T14:40:00Z',
        endDateTime: '2022-12-21T15:20:00Z',
      },
      {
        summary: 'Google Event 1',
        startDateTime: '2022-12-21T18:00:00Z',
        endDateTime: '2022-12-21T18:30:00Z',
      },
    ];
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, two events deleted, one event added, split over multiple pages
    interceptGetEventsApi(({params}) => {
      if (!params.hasOwnProperty('pageToken')) {
        expect(params).toEqual({syncToken: 'google_sync_token_2'});
        return createMockJsonResponse({
          nextPageToken: 'google_page_token',
          items: [
            {
              id: 'google_event_1',
              status: 'cancelled',
            },
            {
              id: 'google_event_3',
              status: 'cancelled',
            },
            // Some random event which we're not interested in (can actually happen)
            {
              id: 'google_event_100',
              status: 'cancelled',
            },
          ],
        });
      }
      expect(params).toEqual({
        pageToken: 'google_page_token',
        syncToken: 'google_sync_token_2',
      });
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token_3',
        items: [
          {
            id: 'google_event_4',
            status: 'confirmed',
            summary: 'Google Event 4',
            start: {
              dateTime: '2022-12-21T23:00:00-05:00',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T23:30:00-05:00',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    }).times(2);
    expectedResponse.events = [
      {
        summary: 'Google Event 4',
        startDateTime: '2022-12-22T04:00:00Z',
        endDateTime: '2022-12-22T04:30:00Z',
      },
    ];
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Force a full sync, split over multiple pages
    interceptGetEventsApi(({params}) => {
      if (params.syncToken === 'google_sync_token_3') {
        return {
          statusCode: 410,
          data: '',
        };
      }
      if (!params.hasOwnProperty('pageToken')) {
        expect(params).toEqual(fullSyncParams);
        return createMockJsonResponse({
          nextPageToken: 'google_page_token_2',
          items: [
            {
              id: 'google_event_5',
              status: 'confirmed',
              summary: 'Google Event 5',
              start: {
                dateTime: '2022-12-21T22:00:00-05:00',
                timeZone: 'America/New_York',
              },
              end: {
                dateTime: '2022-12-22T00:00:00-05:00',
                timeZone: 'America/New_York',
              },
            },
          ],
        });
      }
      expect(params).toEqual({
        ...fullSyncParams,
        pageToken: 'google_page_token_2',
      });
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token_4',
        items: [
          {
            id: 'google_event_6',
            status: 'confirmed',
            summary: 'Google Event 6',
            start: {
              dateTime: '2022-12-21T22:30:00-05:00',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T23:00:00-05:00',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    }).times(3);
    expectedResponse.events = [
      // Event 4 should have been dropped
      {
        summary: 'Google Event 5',
        startDateTime: '2022-12-22T03:00:00Z',
        endDateTime: '2022-12-22T05:00:00Z',
      },
      {
        summary: 'Google Event 6',
        startDateTime: '2022-12-22T03:30:00Z',
        endDateTime: '2022-12-22T04:00:00Z',
      },
    ];
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Incremental sync, no changes
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual({syncToken: 'google_sync_token_4'});
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token_4',
        items: [],
      });
    });
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/me/google-calendar-events (GET) (meeting changes)', async () => {
    const {token} = await signupNewUserWithGoogle({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, token);
    const fullSyncParams = {
      maxAttendees: '1',
      singleEvents: 'true',
      timeMin: '2022-12-21T15:00:00Z',
      timeMax: '2022-12-24T21:00:00Z',
    };
    // Full sync, one page
    interceptGetEventsApi(({params}) => {
      expect(params).toEqual(fullSyncParams);
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token',
        items: [
          {
            id: 'google_event_1',
            status: 'confirmed',
            summary: 'Google Event 1',
            start: {
              dateTime: '2022-12-21T12:00:00-05:00',
              timeZone: 'America/New_York',
            },
            end: {
              dateTime: '2022-12-21T12:30:00-05:00',
              timeZone: 'America/New_York',
            },
          },
        ],
      });
    }).persist();
    const expectedResponse = {
      events: [
        {
          summary: 'Google Event 1',
          startDateTime: '2022-12-21T17:00:00Z',
          endDateTime: '2022-12-21T17:30:00Z',
        },
      ]
    };
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    // Changing the start hour, end hour or timezone should trigger a full sync
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({minStartHour: 9})
      .expect(HttpStatus.OK);
    fullSyncParams.timeMin = '2022-12-21T14:00:00Z';
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({maxEndHour: 17})
      .expect(HttpStatus.OK);
    fullSyncParams.timeMax = '2022-12-24T22:00:00Z';
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({timezone: 'America/Los_Angeles'})
      .expect(HttpStatus.OK);
    fullSyncParams.timeMin = '2022-12-21T17:00:00Z';
    fullSyncParams.timeMax = '2022-12-25T01:00:00Z';
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
      .expect(HttpStatus.OK)
      .expect(expectedResponse);
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/me/google-calendar-events (GET) (refresh token)', async () => {
    const {sub, name, email, token} = await signupNewUserWithGoogle({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, token);
    const mockResponseBody = await createTokenResponse({
      sub, name, email,
      access_token: 'google_access_token_2',
      scope: responseScopes,
    });
    mockAgent.get(oauth2ApiBaseUrl).intercept({
      path: '/token',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    }).reply(({body}) => {
      const params = Object.fromEntries(new URLSearchParams(body as string).entries());
      expect(params).toEqual({
        client_id: mockClientId,
        client_secret: mockClientSecret,
        grant_type: 'refresh_token',
        refresh_token: 'google_refresh_token',
      });
      return createMockJsonResponse(mockResponseBody);
    });
    interceptGetEventsApi(({headers}) => {
      expect(headers).toEqual({
        authorization: 'Bearer google_access_token_2',
      });
      return createMockJsonResponse({
        nextSyncToken: 'google_sync_token',
        items: [],
      });
    });
    const now = Date.now();  // milliseconds
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => now + 3_600_000);  // add 1 hour
    try {
      await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token)
        .expect(HttpStatus.OK)
        .expect({events: []});
    } finally {
      Date.now = originalDateNow;
    }
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/meetings/:id/schedule (PUT|DELETE) (create/update/delete events)', async () => {
    const {token: token1} = await signupNewUserWithGoogle({}, app);
    const {token: token2} = await signupNewUserWithGoogle({}, app);
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
        path: isUpdate ? `${eventsApiPath}/google_event_1` : eventsApiPath,
        method: isUpdate ? 'PUT' : 'POST',
      }).reply(({headers, body}) => {
        try {
          expect(headers).toEqual({
            authorization: 'Bearer google_access_token',
            'content-type': 'application/json',
          });
          expect(JSON.parse(body as string)).toEqual({
            start: {
              dateTime: schedule.startDateTime,
            },
            end: {
              dateTime: schedule.endDateTime,
            },
            summary: createMeetingDto.name,
            source: {
              url: `http://cabbagemeet.internal/m/${meetingID}`,
            },
          });
        } catch (err) {
          createEventReject(err);
          return;
        }
        if (++numEventsCreated === expectedTimes) {
          // The server saves the event to the database AFTER it makes the
          // request to the Google API. So we need to wait until the DB is
          // updated.
          // TODO: figure out a better way to do this
          (async () => {
            try {
              await waitUntilCreatedEventIsSavedInDB('google_event_1', expectedTimes, app);
              createEventResolve(null);
            } catch (err) {
              createEventReject(err);
            }
          })();
        }
        return createMockJsonResponse({
          id: 'google_event_1',
          status: 'confirmed',
          summary: createMeetingDto.name,
          start: {
            dateTime: schedule.startDateTime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: schedule.endDateTime,
            timeZone: 'UTC',
          },
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
        path: `${eventsApiPath}/google_event_1`,
      }).reply(({headers}) => {
        try {
          expect(numEventsDeleted).toBeLessThan(expectedTimes);
          expect(headers).toEqual({authorization: 'Bearer google_access_token'})
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
        nextSyncToken: 'google_sync_token',
        items: [
          {
            id: 'google_event_1',
            status: 'confirmed',
            summary: 'Google Event 1',
            start: {
              dateTime: schedule.startDateTime,
              timeZone: 'UTC',
            },
            end: {
              dateTime: schedule.endDateTime,
              timeZone: 'UTC',
            },
          },
        ],
      });
    });
    await GET(`/api/me/google-calendar-events?meetingID=${meetingID}`, app, token1)
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

    await deleteAccountAndExpectTokenToBeRevoked(app, token1);
    await deleteAccountAndExpectTokenToBeRevoked(app, token2);
  });

  it('/api/meetings/:id/schedule (PUT) (update/delete event which no longer exists)', async () => {
    const {token} = await signupNewUserWithGoogle({}, app);
    const createMeetingDto = {...sampleCreateMeetingDto};
    const {meetingID} = await createMeeting(createMeetingDto, app);
    await putSelfRespondent({availabilities: []}, meetingID, app, token);
    const schedule = {...sampleSchedule};

    const eventCreationHandler = (eventID: string) => createMockJsonResponse({
      id: eventID,
      status: 'confirmed',
      summary: createMeetingDto.name,
      start: {
        dateTime: schedule.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: schedule.endDateTime,
        timeZone: 'UTC',
      },
    });
    const [createEventPromise, createEventResolve, createEventReject] = createPromiseCallbacks();
    mockAgent.get(apiBaseUrl).intercept({
      method: 'POST',
      path: eventsApiPath,
    }).reply(() => {
      createEventResolve(null);
      return eventCreationHandler('google_event_1');
    });
    await scheduleMeeting(meetingID, schedule, app);
    await createEventPromise;
    await waitUntilCreatedEventIsSavedInDB('google_event_1', 1, app);

    const [updateEventPromise, updateEventResolve, updateEventReject] = createPromiseCallbacks();
    mockAgent.get(apiBaseUrl).intercept({
      method: 'PUT',
      path: `${eventsApiPath}/google_event_1`,
    }).reply(() => {
      return {
        statusCode: 410,
        body: GONE_error,
      };
    });
    mockAgent.get(apiBaseUrl).intercept({
      method: 'POST',
      path: eventsApiPath,
    }).reply(() => {
      updateEventResolve(null);
      return eventCreationHandler('google_event_2');
    });
    createMeetingDto.about = 'Some new description';
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({about: createMeetingDto.about})
      .expect(HttpStatus.OK);
    await updateEventPromise;
    await waitUntilCreatedEventIsSavedInDB('google_event_2', 1, app);

    const [deleteEventPromise, deleteEventResolve, deleteEventReject] = createPromiseCallbacks();
    mockAgent.get(apiBaseUrl).intercept({
      method: 'DELETE',
      path: `${eventsApiPath}/google_event_2`,
    }).reply(() => {
      deleteEventResolve(null);
      return {
        statusCode: 410,
        body: GONE_error,
      };
    });
    await DELETE('/api/meetings/' + meetingID, app, token);
    await deleteEventPromise;

    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/meetings/:id/schedule (PUT) (account is unlinked)', async () => {
    const {token} = await signupNewUserWithGoogle({}, app);
    await DELETE('/api/me/link-google-calendar', app, token)
      .expect(HttpStatus.OK);
    const createMeetingDto = {...sampleCreateMeetingDto};
    const schedule = {...sampleSchedule};
    const {meetingID} = await createMeeting(createMeetingDto, app);
    await putSelfRespondent({availabilities: []}, meetingID, app, token);
    await scheduleMeeting(meetingID, schedule, app);
    // The server should NOT try to create an event.
    // If the server mistakenly sends a request, give it time for the
    // error to occur.
    await sleep(50);

    // Likewise for re-scheduling a meeting.
    schedule.startDateTime = '2022-12-22T02:30:00Z';
    await scheduleMeeting(meetingID, schedule, app);
    await sleep(50);

    // Likewise for modifying a scheduled meeting.
    createMeetingDto.name = 'A new name';
    await PATCH('/api/meetings/' + meetingID, app, token)
      .send({name: createMeetingDto.name})
      .expect(HttpStatus.OK);
    await sleep(50);

    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it.each([true, false])(
    (
      '/api/meetings/:id/schedule (PUT) ' +
      '(unschedule meeting or remove availabilities while event is being created)'
    ),
    async (shouldRemoveAvailabilities) =>
  {
    const {token} = await signupNewUserWithGoogle({}, app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    await putSelfRespondent({availabilities: []}, meetingID, app, token);
    mockAgent.get(apiBaseUrl).intercept({
      method: 'POST',
      path: eventsApiPath,
    }).reply(() => {
      return createMockJsonResponse({
        id: 'google_event_1',
        status: 'confirmed',
        summary: sampleCreateMeetingDto.name,
        start: {
          dateTime: sampleSchedule.startDateTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: sampleSchedule.endDateTime,
          timeZone: 'UTC',
        },
      });
    });
    const [deleteEventPromise, deleteEventResolve, deleteEventReject] = createPromiseCallbacks();
    mockAgent.get(apiBaseUrl).intercept({
      method: 'DELETE',
      path: `${eventsApiPath}/google_event_1`,
    }).reply(() => {
      deleteEventResolve(null);
      return {
        statusCode: 204,
        data: '',
      };
    });
    const [createEventPromise, createEventResolve, createEventReject] = createPromiseCallbacks();
    const [invalidateEventPromise, invalidateEventResolve, invalidateEventReject] = createPromiseCallbacks();
    // Workaround for https://github.com/nodejs/undici/issues/1348
    const oauth2Service = app.get(OAuth2Service);
    oauth2Service.apiRequest = async (...args: Parameters<InstanceType<typeof OAuth2Service>['apiRequest']>) => {
      // Deleting the property will restore the prototype's function
      delete oauth2Service.apiRequest;
      createEventResolve(null);
      await invalidateEventPromise;
      return oauth2Service.apiRequest(...args);
    };
    try {
      await scheduleMeeting(meetingID, sampleSchedule, app);
      await createEventPromise;
      if (shouldRemoveAvailabilities) {
        await removeSelfRespondent(meetingID, app, token);
      } else {
        await unscheduleMeeting(meetingID, app);
      }
      invalidateEventResolve(null);
    } catch (err) {
      invalidateEventReject(err);
      throw err;
    } finally {
      delete oauth2Service.apiRequest;
    }
    await deleteEventPromise;
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it.each([true, false])(
    (
      '/api/meetings/:id/schedule (PUT) ' +
      '(unschedule meeting or remove availabilities while event is being updated)'
    ),
    async (shouldRemoveAvailabilities) =>
  {
    const {token} = await signupNewUserWithGoogle({}, app);
    const createMeetingDto = {...sampleCreateMeetingDto};
    const {meetingID} = await createMeeting(createMeetingDto, app);
    await putSelfRespondent({availabilities: []}, meetingID, app, token);
    const createCreateOrUpdateResponse = (eventID: string) => createMockJsonResponse({
      id: eventID,
      status: 'confirmed',
      summary: createMeetingDto.name,
      start: {
        dateTime: sampleSchedule.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: sampleSchedule.endDateTime,
        timeZone: 'UTC',
      },
    });
    mockAgent.get(apiBaseUrl).intercept({
      method: 'POST',
      path: eventsApiPath,
    }).reply(() => createCreateOrUpdateResponse('google_event_1'));
    await scheduleMeeting(meetingID, sampleSchedule, app);
    await waitUntilCreatedEventIsSavedInDB('google_event_1', 1, app);
    createMeetingDto.name = 'A new name';
    // Pretend that the user deleted the event themselves, so the server
    // will try to create a new one
    mockAgent.get(apiBaseUrl).intercept({
      method: 'PUT',
      path: `${eventsApiPath}/google_event_1`,
    }).reply(410, '');
    mockAgent.get(apiBaseUrl).intercept({
      method: 'POST',
      path: eventsApiPath,
    }).reply(() => createCreateOrUpdateResponse('google_event_2'));
    const [createEventPromise, createEventResolve, createEventReject] = createPromiseCallbacks();
    const [invalidateEventPromise, invalidateEventResolve, invalidateEventReject] = createPromiseCallbacks();
    const [deleteEventPromise, deleteEventResolve, deleteEventReject] = createPromiseCallbacks();
    // Workaround for https://github.com/nodejs/undici/issues/1348
    const oauth2Service = app.get(OAuth2Service);
    oauth2Service.apiRequest = async (...args: Parameters<InstanceType<typeof OAuth2Service>['apiRequest']>) => {
      if (args[3].method === 'POST') {
        // Deleting the property will restore the prototype's function
        delete oauth2Service.apiRequest;
        createEventResolve(null);
        await invalidateEventPromise;
      }
      return OAuth2Service.prototype.apiRequest.call(oauth2Service, ...args);
    };
    mockAgent.get(apiBaseUrl).intercept({
      method: 'DELETE',
      path: `${eventsApiPath}/google_event_1`,
    }).reply(() => {
      return {
        statusCode: 410,
        data: '',
      };
    });
    mockAgent.get(apiBaseUrl).intercept({
      method: 'DELETE',
      path: `${eventsApiPath}/google_event_2`,
    }).reply(() => {
      deleteEventResolve(null);
      return {
        statusCode: 204,
        data: '',
      };
    });
    try {
      await PATCH('/api/meetings/' + meetingID, app, token)
        .send({name: createMeetingDto.name})
        .expect(HttpStatus.OK);
      await createEventPromise;
      if (shouldRemoveAvailabilities) {
        await removeSelfRespondent(meetingID, app, token);
      } else {
        await unscheduleMeeting(meetingID, app);
      }
      invalidateEventResolve(null);
    } catch (err) {
      invalidateEventReject(err);
      throw err;
    } finally {
      delete oauth2Service.apiRequest;
    }
    await deleteEventPromise;
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });
});
