import { HttpStatus } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type EditUserDto from '../src/users/edit-user.dto';
import {
  commonAfterAll,
  commonBeforeAll,
  commonBeforeEach,
  createUser,
  DELETE,
  GET,
  PATCH,
} from './e2e-testing-helpers';

describe('UsersController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await commonBeforeAll({ VERIFY_SIGNUP_EMAIL_ADDRESS: 'false' });
  });
  beforeEach(commonBeforeEach);
  afterAll(() => commonAfterAll(app));

  it('/api/me (GET)', async () => {
    const { token, ...user } = await createUser(app);
    await GET('/api/me', app, token).expect(HttpStatus.OK).expect(user);
  });

  it('/api/me (PATCH)', async () => {
    const { token, ...user } = await createUser(app);
    const updateObject: EditUserDto = {
      name: 'Joe',
      subscribe_to_notifications: true,
    };
    user.name = updateObject.name;
    user.isSubscribedToNotifications = updateObject.subscribe_to_notifications;
    await PATCH('/api/me', app, token)
      .send(updateObject)
      .expect(HttpStatus.OK)
      .expect(user);
    // changes should have been persisted
    await GET('/api/me', app, token).expect(HttpStatus.OK).expect(user);
    // changing email is not allowed
    await PATCH('/api/me', app, token)
      .send({ email: 'joe@example2.com' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('/api/me (DELETE)', async () => {
    const { token } = await createUser(app);
    await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
    // token should no longer be valid
    await GET('/api/me', app, token).expect(HttpStatus.UNAUTHORIZED);
  });
});
