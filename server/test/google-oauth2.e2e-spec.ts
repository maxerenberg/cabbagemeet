import { URL } from 'url';
import { jest } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Dispatcher } from 'undici';
import type { CustomRedirectResponse } from '../src/common-responses';
import { getSecondsSinceUnixEpoch } from '../src/dates.utils';
import { jwtSign } from '../src/misc.utils';
import {
  addGuestRespondent,
  commonAfterAll,
  commonBeforeAll,
  commonBeforeEach,
  createMeeting,
  createUser,
  DELETE,
  deleteRespondent,
  editUser,
  GET,
  getMeeting,
  PATCH,
  POST,
  PUT,
  putSelfRespondent,
  scheduleMeeting,
  unscheduleMeeting,
  updateRespondent,
} from './e2e-testing-helpers';

type MockRequestHandlerCoreReturnType = {
  statusCode: number;
  body: any;
};
type MockRequestHandlerType = (url: string, options?: Dispatcher.DispatchOptions) =>
  MockRequestHandlerCoreReturnType | undefined | Promise<MockRequestHandlerCoreReturnType | undefined>;
let mockRequestHandler: MockRequestHandlerType | undefined;
function setMockRequestHandler(handler: MockRequestHandlerType) {
  mockRequestHandler = handler;
}

// calling this inside the describe() block doesn't seem to work
jest.mock('undici', () => ({
  async request(...args: Parameters<MockRequestHandlerType>) {
    let mockResult = mockRequestHandler(...args);
    if (mockResult instanceof Promise) {
      mockResult = await mockResult;
    }
    if (mockResult === undefined) {
      console.error('Did not handle request: ', ...args);
      throw new Error('Aborting...');
    }
    if (!mockResult.body) {
      // e.g. NO_CONTENT response
      return {
        statusCode: mockResult.statusCode,
        headers: {'content-type': 'text/plain'},
        body: {
          text: () => new Promise(resolve => resolve('')),
          json: () => new Promise((resolve, reject) => reject('should not call .json() here')),
        },
      };
    }
    return {
      statusCode: mockResult.statusCode,
      headers: {'content-type': 'application/json; charset=UTF-8'},
      body: {
        text: () => new Promise(resolve => resolve(JSON.stringify((mockResult as MockRequestHandlerCoreReturnType).body))),
        json: () => new Promise(resolve => resolve((mockResult as MockRequestHandlerCoreReturnType).body)),
      },
    };
  }
}));

function decodeQueryParams(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const kvPair of decodeURIComponent(queryString).split('&')) {
    const [key, val] = kvPair.split('=');
    result[key] = val;
  }
  return result;
}

const authzEndpointPrefix = 'https://accounts.google.com/o/oauth2/v2/auth?';
const nonce = 'abcdef';
const mockClientId = 'google_client_id';
const mockClientSecret = 'google_client_secret';
const mockAuthzCode = 'google_code';
const mockRedirectUri = 'http://cabbagemeet.internal/redirect/google';

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
  expect(redirect.startsWith(authzEndpointPrefix));
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

function setMockHandlerForTokenEndpoint({
  sub, name, email,
  access_token = 'google_access_token',
  refresh_token = 'google_refresh_token',
  scope = 'openid https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
}: {
  sub: string, name: string, email: string,
  access_token?: string, refresh_token?: string | null,
  scope?: string,
}) {
  setMockRequestHandler(async (url, options) => {
    if (url !== 'https://oauth2.googleapis.com/token') {
      return undefined;
    }
    expect(options).toEqual({
      method: 'POST',
      body: options.body,
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    });
    expect(Object.fromEntries(new URLSearchParams(options.body as string))).toEqual({
      client_id: mockClientId,
      redirect_uri: mockRedirectUri,
      client_secret: mockClientSecret,
      code: mockAuthzCode,
      grant_type: 'authorization_code',
    });
    const now = getSecondsSinceUnixEpoch();
    // Note: this will use HS256 for signing. Google/Microsoft use RS256.
    // If we implement JWT verification in the server, we need to create
    // a new keypair and use RS256 as well.
    const id_token =  await jwtSign(
      {
        iss: 'https://accounts.google.com',
        sub,
        email,
        name,
        iat: now,
        exp: now + 3600,
      },
      'secret',
    );
    const body: Record<string, any> = {
      access_token,
      expires_in: 3599,
      scope,
      token_type: 'Bearer',
      id_token,
    };
    if (refresh_token !== null) {
      body.refresh_token = refresh_token;
    }
    return {
      statusCode: 200,
      body,
    };
  });
}

function setMockHandlerForRevokeEndpoint(
  {
    refresh_token = 'google_refresh_token',
  }: {
    refresh_token?: string,
  },
  cb?: () => void,
) {
  setMockRequestHandler(async (url, options) => {
    if (url !== 'https://oauth2.googleapis.com/revoke') {
      return undefined;
    }
    expect(options).toEqual({
      method: 'POST',
      body: options.body,
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    });
    expect(Object.fromEntries(new URLSearchParams(options.body as string))).toEqual({
      token: refresh_token,
    });
    if (cb) cb();
    return {
      statusCode: 204,
      body: undefined,
    };
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

async function signupNewUserWithGoogle({sub, name, email}: {sub: string, name: string, email: string}, app: INestApplication): Promise<string> {
  const redirect = await signupOrLoginOrLink('signup', app);
  setMockHandlerForTokenEndpoint({sub, name, email});
  const redirect2 = (
    await GET(redirect, app).expect(HttpStatus.FOUND)
  ).headers.location as string;
  expect(redirect2.startsWith('/?'));
  const redirect2Params = decodeQueryParams(redirect2.slice(2));
  expect(redirect2Params).toEqual({
    token: redirect2Params.token,
    nonce,
  });
  return redirect2Params.token;
}

describe('OAuth2Controller (e2e)', () => {
  let app: NestExpressApplication;
  let token1: string | undefined;
  const mockSub1 = '1234567890';
  const mockEmail1 = 'test1@gmail.com';
  const mockName1 = 'Test 1';
  const mockSub2 = '2345678901';
  const mockEmail2 = 'test2@gmail.com';
  const mockName2 = 'Test 2';

  beforeAll(async () => {
    app = await commonBeforeAll({
      VERIFY_SIGNUP_EMAIL_ADDRESS: 'false',
      OAUTH2_GOOGLE_CLIENT_ID: mockClientId,
      OAUTH2_GOOGLE_CLIENT_SECRET: mockClientSecret,
      OAUTH2_GOOGLE_REDIRECT_URI: mockRedirectUri,
    });
  });
  beforeEach(commonBeforeEach);
  afterAll(() => commonAfterAll(app));

  beforeEach(() => {
    setMockRequestHandler(() => undefined);
  });

  it('/api/signup-with-google (POST)', async () => {
    token1 = await signupNewUserWithGoogle({sub: mockSub1, name: mockName1, email: mockEmail1}, app);
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
    setMockHandlerForTokenEndpoint({sub: mockSub1, name: mockName1, email: mockEmail1});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2).toStrictEqual('/error?e=E_OAUTH2_ACCOUNT_ALREADY_LINKED&provider=GOOGLE');
  });

  it('/api/signup-with-google (POST) (not all scopes granted)', async () => {
    const redirect = await signupOrLoginOrLink('signup', app);
    setMockHandlerForTokenEndpoint({
      sub: mockSub2, name: mockName2, email: mockEmail2,
      // missing Calendar API scope
      scope: 'openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    });
    const {headers} = await GET(redirect, app).expect(HttpStatus.FOUND);
    const redirect2 = headers['location'] as string;
    expect(redirect2).toStrictEqual('/error?e=E_OAUTH2_NOT_ALL_SCOPES_GRANTED&provider=GOOGLE');
  });

  it('/api/login-with-google (POST) (user does not exist, no refresh token)', async () => {
    const redirect = await signupOrLoginOrLink('login', app);
    setMockHandlerForTokenEndpoint({
      sub: mockSub2, name: mockName2, email: mockEmail2,
      refresh_token: null,
    });
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to consent page
    expect(redirect2.startsWith(authzEndpointPrefix)).toBe(true);
    const params = Object.fromEntries(new URL(redirect2).searchParams.entries());
    expect(params.prompt).toStrictEqual('consent');
    setMockHandlerForTokenEndpoint({sub: mockSub2, name: mockName2, email: mockEmail2});
    const redirect3 = (
      await GET(`/redirect/google?code=${mockAuthzCode}&state=${params.state}`, app)
        .expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect3.startsWith('/?'));
    const redirect3Params = decodeQueryParams(redirect3.slice(2));
    expect(redirect3Params).toEqual({
      token: redirect3Params.token,
      nonce,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, redirect3Params.token);
  });

  it('/api/login-with-google (POST) (user does not exist, refresh token is present)', async () => {
    const redirect = await signupOrLoginOrLink('login', app);
    setMockHandlerForTokenEndpoint({sub: mockSub2, name: mockName2, email: mockEmail2});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2.startsWith('/?'));
    const redirect2Params = decodeQueryParams(redirect2.slice(2));
    expect(redirect2Params).toEqual({
      token: redirect2Params.token,
      nonce,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, redirect2Params.token);
  });

  it('/api/login-with-google (POST) (user exists, not linked yet, no refresh token)', async () => {
    const email = 'userExistsButNotLinkedNoRefreshToken@gmail.com';
    const {token} = await createUser(app, {email});
    const redirect = await signupOrLoginOrLink('login', app);
    setMockHandlerForTokenEndpoint({
      sub: '345678', name: 'Test', email,
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
    const name = 'George';
    const email = 'userExistsButNotLinked@gmail.com';
    await createUser(app, {name, email});
    const redirect = await signupOrLoginOrLink('login', app);
    setMockHandlerForTokenEndpoint({sub: '456789', name: 'Pseudonym', email});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    // should get redirected to link confirmation page
    expect(redirect2.startsWith('/confirm-link-google-account?')).toBe(true);
    const redirect2Params = decodeQueryParams(redirect2.slice('/confirm-link-google-account?'.length));
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
    await signupNewUserWithGoogle(
      {sub: mockSub2, name: mockName2, email: mockEmail2}, app
    );
    const redirect = await signupOrLoginOrLink('login', app);
    setMockHandlerForTokenEndpoint({
      sub: mockSub2, name: mockName2, email: mockEmail2,
      // refresh token is not present in Google OIDC responses if the user
      // already granted consent
      refresh_token: null,
    });
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2.startsWith('/?')).toBe(true);
    const redirect2Params = decodeQueryParams(redirect2.slice('/?'.length));
    expect(redirect2Params).toEqual({
      token: redirect2Params.token,
      nonce,
    });
    await deleteAccountAndExpectTokenToBeRevoked(app, redirect2Params.token);
  });

  it('/api/me/link-google-calendar (POST) (no refresh token)', async () => {
    const {token} = await createUser(app, {name: mockName2, email: mockEmail2});
    const redirect = await signupOrLoginOrLink('link', app, token);
    setMockHandlerForTokenEndpoint({
      sub: mockSub2, name: mockName2, email: mockEmail2,
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

  it('/api/me/link-google-calendar (POST) (refresh token is present)', async () => {
    const {token} = await createUser(app, {name: mockName2, email: mockEmail2});
    const redirect = await signupOrLoginOrLink('link', app, token);
    setMockHandlerForTokenEndpoint({sub: mockSub2, name: mockName2, email: mockEmail2});
    const redirect2 = (
      await GET(redirect, app).expect(HttpStatus.FOUND)
    ).headers.location as string;
    expect(redirect2).toStrictEqual('/');
    const {body: user} = await GET('/api/me', app, token).expect(HttpStatus.OK);
    expect(user.hasLinkedGoogleAccount).toBe(true);
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  it('/api/me/link-google-calendar (DELETE) (signed up with email)', async () => {
    const {token} = await createUser(app, {name: mockName2, email: mockEmail2});
    const redirect = await signupOrLoginOrLink('link', app, token);
    setMockHandlerForTokenEndpoint({sub: mockSub2, name: mockName2, email: mockEmail2});
    await GET(redirect, app).expect(HttpStatus.FOUND);
    await unlinkAccountAndExpectTokenToBeRevoked(app, token);
    await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
  });

  it('/api/me/link-google-calendar (DELETE) (signed up with Google)', async () => {
    const token = await signupNewUserWithGoogle(
      {sub: mockSub2, name: mockName2, email: mockEmail2}, app
    );
    // token should not be revoked because user signed up with Google
    const {body: user} = await DELETE('/api/me/link-google-calendar', app, token)
      .expect(HttpStatus.OK);
    expect(user.hasLinkedGoogleAccount).toBe(false);
    await deleteAccountAndExpectTokenToBeRevoked(app, token);
  });

  // TODO: test syncing calendar events
});
