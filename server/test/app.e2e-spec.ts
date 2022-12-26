import { HttpStatus } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { commonAfterAll, commonBeforeAll, commonBeforeEach } from './e2e-testing-helpers';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => { app = await commonBeforeAll(); });
  beforeEach(commonBeforeEach);
  afterAll(() => commonAfterAll(app));

  it('/api/server-info (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/server-info')
      .expect(HttpStatus.OK)
      .expect({
        googleOAuth2IsSupported: false,
        microsoftOAuth2IsSupported: false,
      });
  });
});
