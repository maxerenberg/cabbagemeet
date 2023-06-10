import { URL } from 'node:url';
import { HttpStatus } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  commonAfterAll,
  commonBeforeAll,
  commonBeforeEach,
  GET,
  POST,
  smtpMessages,
  waitForEmailMessage,
} from './e2e-testing-helpers';
import { sleep } from '../src/misc.utils';

describe('AuthController (e2e)', () => {
  let app: NestExpressApplication;
  let token: string | undefined;

  beforeAll(async () => {
    app = await commonBeforeAll();
  });
  beforeEach(commonBeforeEach);
  afterAll(() => commonAfterAll(app));

  it('/api/signup (POST)', async () => {
    await POST('/api/signup', app)
      .send({ name: 'Bob', email: 'a@b', password: 'abcdef' })
      .expect(HttpStatus.OK)
      .expect({ mustVerifyEmailAddress: true });
    expect(smtpMessages).toHaveLength(1);
    expect(smtpMessages[0].from).toStrictEqual('no-reply@cabbagemeet.internal');
    expect(smtpMessages[0].to).toStrictEqual('a@b');
    expect(smtpMessages[0].subject).toStrictEqual(
      'CabbageMeet signup confirmation',
    );
    expect(
      smtpMessages[0].body.startsWith(
        `Hello Bob,

Please click the following link to verify your email address:

http://cabbagemeet.internal/verify-email?`,
      ),
    ).toBe(true);
    const url = smtpMessages[0].body.split('\n')[4];
    const params = new URL(url).searchParams;
    expect(params.has('encrypted_entity')).toBe(true);
    const verifyBody = [...params].reduce(
      (o, [key, val]) => ({ ...o, [key]: val }),
      {},
    );
    await POST('/api/verify-email', app)
      .send(verifyBody)
      .expect(HttpStatus.NO_CONTENT);
  });

  it('/api/login (POST)', async () => {
    const { body } = await POST('/api/login', app)
      .send({ email: 'a@b', password: 'abcdef' })
      .expect(HttpStatus.OK);
    expect(body).toEqual({
      name: 'Bob',
      email: 'a@b',
      hasLinkedGoogleAccount: false,
      hasLinkedMicrosoftAccount: false,
      isSubscribedToNotifications: false,
      token: body.token,
      userID: body.userID,
    });
    token = body.token;
  });

  it('/api/logout (POST)', async () => {
    expect(token).toBeDefined();
    await POST('/api/logout', app, token).expect(HttpStatus.NO_CONTENT);
    // If the `everywhere` param is not set to true, the API call should do nothing
    await GET('/api/me', app, token).expect(HttpStatus.OK);
    await POST('/api/logout?everywhere=true', app, token).expect(
      HttpStatus.NO_CONTENT,
    );
    // The token should no longer work
    await GET('/api/me', app, token).expect(HttpStatus.UNAUTHORIZED);
    token = undefined;
  });

  it('/api/reset-password (POST)', async () => {
    await POST('/api/reset-password', app)
      .send({ email: 'b@c' })
      .expect(HttpStatus.NO_CONTENT);
    // We are trying to make sure that an email message does *not* arrive
    await sleep(200);
    // For an email address with no corresponding user, no email should get sent
    expect(smtpMessages).toHaveLength(0);
    await POST('/api/reset-password', app)
      .send({ email: 'a@b' })
      .expect(HttpStatus.NO_CONTENT);
    if (smtpMessages.length < 1) {
      await waitForEmailMessage();
    }
    expect(smtpMessages[0].from).toStrictEqual('no-reply@cabbagemeet.internal');
    expect(smtpMessages[0].to).toStrictEqual('a@b');
    expect(smtpMessages[0].subject).toStrictEqual('CabbageMeet password reset');
    expect(
      smtpMessages[0].body.startsWith(
        `Hello Bob,

Someone (hopefully you) recently requested a password reset for your
CabbageMeet account. If this was you, please click the following link
to proceed:

http://cabbagemeet.internal/confirm-password-reset?pwresetToken=`,
      ),
    ).toBe(true);
    const url = smtpMessages[0].body.split('\n')[6];
    const pwresetToken = new URL(url).searchParams.get('pwresetToken');
    await POST('/api/confirm-password-reset', app, pwresetToken)
      .send({ password: 'bcdefg' })
      .expect(HttpStatus.NO_CONTENT);
    // Re-using a password reset token should not be allowed
    await POST('/api/confirm-password-reset', app, pwresetToken)
      .send({ password: 'bcdefg' })
      .expect(HttpStatus.UNAUTHORIZED);
    // Should be possible to login with the new password
    await POST('/api/login', app)
      .send({ email: 'a@b', password: 'bcdefg' })
      .expect(HttpStatus.OK);
  });

  it.each([
    { signupOrLogin: 'signup', provider: 'google' },
    { signupOrLogin: 'signup', provider: 'microsoft' },
    { signupOrLogin: 'login', provider: 'google' },
    { signupOrLogin: 'login', provider: 'microsoft' },
  ])(
    '/api/(signup|login)-with-(google|microsoft) (POST)',
    ({ signupOrLogin, provider }) => {
      return POST(`/api/${signupOrLogin}-with-${provider}`, app)
        .send({ post_redirect: '/', nonce: 'abcdef' })
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
    },
  );
});
