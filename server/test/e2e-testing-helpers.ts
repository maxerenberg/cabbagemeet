import { expect } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import { SMTPServer } from 'smtp-server';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { commonAppBootstrap } from '../src/common-setup';
import type { EnvironmentVariables } from '../src/config/env.validation';
import { getSecondsSinceUnixEpoch } from '../src/dates.utils';
import type AddGuestRespondentDto from '../src/meetings/add-guest-respondent.dto';
import type PutRespondentDto from '../src/meetings/put-respondent.dto';
import type CreateMeetingDto from '../src/meetings/create-meeting.dto';
import type MeetingResponse from '../src/meetings/meeting-response';
import type ScheduleMeetingDto from '../src/meetings/schedule-meeting.dto';
import { assert, jwtSign } from '../src/misc.utils';
import type EditUserDto from '../src/users/edit-user.dto';
import type UserResponse from '../src/users/user-response';
import type { UserResponseWithToken } from '../src/users/user-response';

let originalProcessEnv: NodeJS.ProcessEnv;

export async function commonBeforeAll(
  envOverride?: Partial<EnvironmentVariables>,
): Promise<NestExpressApplication> {
  originalProcessEnv = process.env;
  process.env = { ...process.env };

  if (envOverride) {
    Object.assign(process.env, envOverride);
  }

  // This is necessary because we need to know which database we're using
  // *before* creating the module fixture. Once the module fixture is
  // created, all of the providers will already have been instantiated.
  dotenv.config({ path: process.env.DOTENV_PATH });

  await createDB();
  await startMockSmtpServer();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  commonAppBootstrap(app);
  await app.init();

  // Workaround for https://github.com/ladjs/supertest/issues/709
  // (See https://github.com/ladjs/supertest/issues/709#issuecomment-1004883763)
  app.getHttpServer().listen(0);

  return app;
}

export async function commonAfterAll(app: INestApplication | undefined) {
  if (app) {
    // Need to stop the app first because we can't drop a database while a
    // client is connected
    await app.close();
  }
  await dropDB();
  await stopMockSmtpServer();
  process.env = originalProcessEnv;
}

function getDatasourceForSuperuser() {
  if (process.env.DATABASE_TYPE === 'sqlite') {
    return new DataSource({
      type: 'better-sqlite3',
      database: process.env.SQLITE_PATH,
    });
  } else if (process.env.DATABASE_TYPE === 'postgres') {
    return new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: +process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_SUPERUSER || 'postgres',
      password: process.env.POSTGRES_SUPERPASSWORD,
      database: process.env.POSTGRES_SUPERDATABASE || 'postgres',
    });
  } else if (process.env.DATABASE_TYPE === 'mariadb') {
    return new DataSource({
      type: 'mariadb',
      host: process.env.MYSQL_HOST,
      port: +process.env.MYSQL_PORT || 3306,
      username: process.env.MYSQL_SUPERUSER || 'root',
      password: process.env.MYSQL_SUPERPASSWORD,
      database: process.env.MYSQL_SUPERDATABASE,
    });
  }
  throw new Error(
    'Unrecognized database type "' + process.env.DATABASE_TYPE + '"',
  );
}

async function createDB() {
  if (process.env.DATABASE_TYPE === 'sqlite') {
    return;
  }
  const datasource = getDatasourceForSuperuser();
  await datasource.initialize();
  const databaseName = 'test' + process.env.JEST_WORKER_ID;
  try {
    await datasource.query(`CREATE DATABASE ${databaseName}`);
    if (process.env.DATABASE_TYPE === 'postgres') {
      await datasource.query(
        `ALTER DATABASE ${databaseName} OWNER TO ${process.env.POSTGRES_USER}`,
      );
      process.env.POSTGRES_DATABASE = databaseName;
    } else if (process.env.DATABASE_TYPE === 'mariadb') {
      await datasource.query(
        `GRANT ALL PRIVILEGES ON ${databaseName}.* TO ${process.env.MYSQL_USER}`,
      );
      process.env.MYSQL_DATABASE = databaseName;
    }
  } finally {
    await datasource.destroy();
  }
}

export async function deleteAllDataFromDB(datasource: DataSource) {
  // All other tables have foreign key constraints to these two with
  // ON DELETE CASCADE
  await datasource.query('DELETE FROM User');
  await datasource.query('DELETE FROM Meeting');
}

async function dropDB() {
  if (process.env.DATABASE_TYPE === 'sqlite') {
    return;
  }
  const datasource = getDatasourceForSuperuser();
  await datasource.initialize();
  let databaseName: string | undefined;
  if (process.env.DATABASE_TYPE === 'postgres') {
    databaseName = process.env.POSTGRES_DATABASE;
  } else if (process.env.DATABASE_TYPE === 'mariadb') {
    databaseName = process.env.MYSQL_DATABASE;
  }
  try {
    assert(databaseName !== undefined);
    await datasource.query(`DROP DATABASE ${databaseName}`);
  } finally {
    await datasource.destroy();
  }
}

type SmtpMessage = {
  from: string;
  to: string;
  subject: string;
  body: string;
};
export const smtpMessages: SmtpMessage[] = [];
let smtpMessageArrivalCallback: (arg: null) => void | undefined;
const smtpMessagesBySessionId: Record<string, SmtpMessage> = {};
const mockSmtpServer = new SMTPServer({
  secure: false,
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  disableReverseLookup: true,
  onMailFrom({ address }, session, callback) {
    smtpMessagesBySessionId[session.id] = { from: address } as SmtpMessage;
    return callback();
  },
  onRcptTo({ address }, session, callback) {
    smtpMessagesBySessionId[session.id].to = address;
    return callback();
  },
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];
    stream.on('data', (data) => {
      chunks.push(data);
    });
    stream.on('end', () => {
      const lines = chunks
        .map((chunk) => chunk.toString())
        .join('')
        .split('\r\n');
      const message = smtpMessagesBySessionId[session.id];
      let contentTransferEncoding: string | undefined;
      // There is an empty line between the headers and the body
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('Subject: ')) {
          let subject = lines[i].slice('Subject: '.length);
          if (subject.startsWith('=?UTF-8?B?') && subject.endsWith('?=')) {
            // https://www.ietf.org/rfc/rfc2047.txt
            subject = Buffer.from(
              subject.slice('=?UTF-8?B?'.length, subject.length - '?='.length),
              'base64',
            ).toString();
            if (lines[i + 1].startsWith(' =?UTF-8?B?')) {
              // wraps around multiple lines
              subject += Buffer.from(
                lines[i + 1].slice(
                  ' =?UTF-8?B?'.length,
                  lines[i + 1].length - '?='.length,
                ),
                'base64',
              ).toString();
              i++;
            }
          }
          message.subject = subject;
        } else if (lines[i].startsWith('Content-Transfer-Encoding: ')) {
          contentTransferEncoding = lines[i].slice(
            'Content-Transfer-Encoding: '.length,
          );
        } else if (lines[i].length === 0) {
          if (contentTransferEncoding === 'base64') {
            message.body = Buffer.from(
              lines.slice(i + 1).join(),
              'base64',
            ).toString();
          } else {
            message.body = lines.slice(i + 1).join('\n');
          }
          break;
        }
      }
      if (message.subject && message.body) {
        smtpMessages.push(message);
        if (smtpMessageArrivalCallback) {
          smtpMessageArrivalCallback(null);
          smtpMessageArrivalCallback = undefined;
        }
      }
      callback();
    });
  },
  onClose(session) {
    delete smtpMessagesBySessionId[session.id];
  },
});

export function commonBeforeEach() {
  smtpMessages.length = 0;
}

function startMockSmtpServer() {
  const port = 8025 + parseInt(process.env.JEST_WORKER_ID);
  process.env.SMTP_PORT = String(port);

  return new Promise<void>((resolve, reject) => {
    mockSmtpServer.listen({ host: '127.0.0.1', port }, () => {
      resolve();
    });
    mockSmtpServer.on('error', (err) => reject(err));
  });
}
function stopMockSmtpServer() {
  return new Promise<void>((resolve) => {
    mockSmtpServer.close(() => {
      resolve();
    });
  });
}

export function sortEmailMessagesByRecipient(messages: SmtpMessage[]) {
  messages.sort((m1, m2) => m1.to.localeCompare(m2.to));
}

export async function waitForEmailMessage() {
  const [promise, resolve] = createPromiseCallbacks();
  smtpMessageArrivalCallback = resolve;
  await promise;
}

function makeRequest(
  method: 'get' | 'post' | 'patch' | 'delete' | 'put',
  apiPath: string,
  app: INestApplication,
  token?: string,
) {
  let req = request(app.getHttpServer())[method](apiPath);
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  return req;
}

export function GET(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('get', apiPath, app, token);
}
export function POST(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('post', apiPath, app, token);
}
export function PATCH(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('patch', apiPath, app, token);
}
export function DELETE(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('delete', apiPath, app, token);
}
export function PUT(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('put', apiPath, app, token);
}

let userCounter = 1;
// VERIFY_SIGNUP_EMAIL_ADDRESS must be set to false to use this function
export async function createUser(
  app: INestApplication,
  options?: { name?: string; email?: string },
): Promise<UserResponseWithToken> {
  const name = options?.name ?? 'Test ' + userCounter;
  const email = options?.email ?? 'test' + userCounter + '@example.com';
  const password = 'abcdef';
  userCounter++;
  const { body } = await POST('/api/signup', app)
    .send({ name, email, password })
    .expect(HttpStatus.CREATED);
  expect(body.userID).toBeDefined();
  return body;
}

export async function editUser(
  editUserDto: EditUserDto,
  app: INestApplication,
  token: string,
): Promise<UserResponse> {
  const { body } = await PATCH('/api/me', app, token)
    .send(editUserDto)
    .expect(HttpStatus.OK);
  return body;
}

export async function createMeeting(
  meetingDto: CreateMeetingDto,
  app: INestApplication,
  token?: string,
): Promise<MeetingResponse> {
  const { body } = await POST('/api/meetings', app, token)
    .send(meetingDto)
    .expect(HttpStatus.CREATED);
  return body;
}

export async function getMeeting(
  meetingID: string,
  app: INestApplication,
  token?: string,
): Promise<MeetingResponse> {
  const { body } = await GET('/api/meetings/' + meetingID, app, token).expect(
    HttpStatus.OK,
  );
  return body;
}

function sortRespondentsInResponse({ body }: { body: MeetingResponse }) {
  body.respondents.sort((r1, r2) => r1.respondentID - r2.respondentID);
}

export async function addGuestRespondent(
  guestRespondentDto: AddGuestRespondentDto,
  meetingID: string,
  app: INestApplication,
): Promise<MeetingResponse> {
  const { body } = await POST(
    `/api/meetings/${meetingID}/respondents/guest`,
    app,
  )
    .send(guestRespondentDto)
    .expect(HttpStatus.CREATED)
    .expect(sortRespondentsInResponse);
  return body;
}

export async function putSelfRespondent(
  putRespondentDto: PutRespondentDto,
  meetingID: string,
  app: INestApplication,
  token: string,
): Promise<MeetingResponse> {
  const { body } = await PUT(
    `/api/meetings/${meetingID}/respondents/me`,
    app,
    token,
  )
    .send(putRespondentDto)
    .expect(HttpStatus.OK)
    .expect(sortRespondentsInResponse);
  return body;
}

export async function removeSelfRespondent(
  meetingID: string,
  app: INestApplication,
  token: string,
) {
  const { body }: { body: MeetingResponse } = await GET(
    '/api/meetings/' + meetingID,
    app,
    token,
  ).expect(HttpStatus.OK);
  await deleteRespondent(body.selfRespondentID, meetingID, app, token);
}

export async function updateRespondent(
  respondentID: number,
  putRespondentDto: PutRespondentDto,
  meetingID: string,
  app: INestApplication,
  token?: string,
): Promise<MeetingResponse> {
  const { body } = await PUT(
    `/api/meetings/${meetingID}/respondents/${respondentID}`,
    app,
    token,
  )
    .send(putRespondentDto)
    .expect(HttpStatus.OK)
    .expect(sortRespondentsInResponse);
  return body;
}

export async function deleteRespondent(
  respondentID: number,
  meetingID: string,
  app: INestApplication,
  token?: string,
): Promise<MeetingResponse> {
  const { body } = await DELETE(
    `/api/meetings/${meetingID}/respondents/${respondentID}`,
    app,
    token,
  )
    .expect(HttpStatus.OK)
    .expect(sortRespondentsInResponse);
  return body;
}

export async function scheduleMeeting(
  meetingID: string,
  scheduleDto: ScheduleMeetingDto,
  app: INestApplication,
  token?: string,
): Promise<MeetingResponse> {
  const { body } = await PUT(`/api/meetings/${meetingID}/schedule`, app, token)
    .send(scheduleDto)
    .expect(HttpStatus.OK)
    .expect(sortRespondentsInResponse);
  return body;
}

export async function unscheduleMeeting(
  meetingID: string,
  app: INestApplication,
  token?: string,
): Promise<MeetingResponse> {
  const { body } = await DELETE(
    `/api/meetings/${meetingID}/schedule`,
    app,
    token,
  )
    .expect(HttpStatus.OK)
    .expect(sortRespondentsInResponse);
  return body;
}

export async function deleteAccount(app: INestApplication, token: string) {
  await DELETE('/api/me', app, token).expect(HttpStatus.NO_CONTENT);
}

export function createPromiseCallbacks() {
  let resolve: (val: unknown) => void;
  let reject: (val: unknown) => void;
  const promise = new Promise((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });
  return [promise, resolve, reject] as const;
}

export function decodeQueryParams(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const kvPair of decodeURIComponent(queryString).split('&')) {
    const [key, val] = kvPair.split('=');
    result[key] = val;
  }
  return result;
}

export async function createTokenResponse({
  sub,
  name,
  email,
  access_token,
  refresh_token,
  scope,
}: {
  sub: string;
  name: string;
  email: string;
  access_token: string;
  refresh_token?: string | null;
  scope: string;
}) {
  const now = getSecondsSinceUnixEpoch();
  // Note: this will use HS256 for signing. Google/Microsoft use RS256.
  // If we implement JWT verification in the server, we need to create
  // a new keypair and use RS256 as well.
  const id_token = await jwtSign(
    {
      iss: 'some-issuer',
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
  if (refresh_token) {
    body.refresh_token = refresh_token;
  }
  return body;
}
