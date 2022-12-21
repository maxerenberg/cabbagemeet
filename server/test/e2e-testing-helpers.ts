import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import { decode as quotedPrintableDecode } from 'quoted-printable';
import { SMTPServer } from 'smtp-server';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { commonAppBootstrap } from '../src/common-setup';
import { assert } from '../src/misc.utils';

export async function commonBeforeAll(): Promise<NestExpressApplication> {
  // TODO: save and restore env vars before/after tests

  // This is necessary because we need to know which database we're using
  // *before* creating the module fixture. Once the module fixture is
  // created, we can't change any of the values in the ConfigService.
  dotenv.config({path: process.env.DOTENV_PATH});

  await createDB();
  await startMockSmtpServer();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  commonAppBootstrap(app);
  await app.init();

  return app;
}

export async function commonAfterAll(app: INestApplication | undefined) {
  if (app) {
    // Need to stop the app first because we can't drop a database while a
    // client is connected
    await app.close();
    await dropDB();
  }
  await stopMockSmtpServer();
}

async function deleteAllDataFromDB(app: INestApplication) {
  const datasource = app.get(DataSource);
  // All other tables have foreign key constraints to these two with
  // ON DELETE CASCADE
  await datasource.query('DELETE FROM User');
  await datasource.query('DELETE FROM Meeting');
}

function getDatasourceForSuperuser() {
  if (process.env.DATABASE_TYPE === 'postgres') {
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
}

async function createDB() {
  const datasource = getDatasourceForSuperuser();
  if (!datasource) return;
  await datasource.initialize();
  const databaseName = 'test' + process.env.JEST_WORKER_ID;
  try {
    await datasource.query(`CREATE DATABASE ${databaseName}`);
    if (process.env.DATABASE_TYPE === 'postgres') {
      await datasource.query(`ALTER DATABASE ${databaseName} OWNER TO ${process.env.POSTGRES_USER}`);
      process.env.POSTGRES_DATABASE = databaseName;
    } else if (process.env.DATABASE_TYPE === 'mariadb') {
      await datasource.query(`GRANT ALL PRIVILEGES ON ${databaseName}.* TO ${process.env.MYSQL_USER}`);
      process.env.MYSQL_DATABASE = databaseName;
    }
  } finally {
    await datasource.destroy();
  }
}

async function dropDB() {
  const datasource = getDatasourceForSuperuser();
  if (!datasource) return;
  await datasource.initialize();
  let databaseName: string | undefined;
  if (process.env.DATABASE_TYPE === 'postgres') {
    databaseName = process.env.POSTGRES_DATABASE;
  } else if (process.env.DATABASE_TYPE === 'mariadb') {
    databaseName = process.env.MYSQL_DATABASE;
  }
  assert(databaseName !== undefined);
  await datasource.query(`DROP DATABASE ${databaseName}`);
  await datasource.destroy();
}

type SmtpMessage = {
  from: string;
  to: string;
  body: string;
};
export const smtpMessages: SmtpMessage[] = [];
const smtpMessagesBySessionId: Record<string, SmtpMessage> = {};
const mockSmtpServer = new SMTPServer({
  secure: false,
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  disableReverseLookup: true,
  onMailFrom({address}, session, callback) {
    smtpMessagesBySessionId[session.id] = {from: address} as SmtpMessage;
    return callback();
  },
  onRcptTo({address}, session, callback) {
    smtpMessagesBySessionId[session.id].to = address;
    return callback();
  },
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];
    stream.on('data', data => {
      chunks.push(data);
    });
    stream.on('end', () => {
      const lines = chunks
        .map(chunk => quotedPrintableDecode(chunk.toString()))
        .join('')
        .split('\r\n');
      // There is an empty line between the headers and the body
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length === 0) {
          smtpMessagesBySessionId[session.id].body = lines.slice(i + 1).join('\n');
          break;
        }
      }
      if (smtpMessagesBySessionId[session.id].body) {
        smtpMessages.push(smtpMessagesBySessionId[session.id]);
      } else {
        delete smtpMessagesBySessionId[session.id];
      }
      callback();
    });
  },
});

export function commonBeforeEach() {
  smtpMessages.length = 0;
}

function startMockSmtpServer() {
  const port = 8025 + parseInt(process.env.JEST_WORKER_ID);
  process.env.SMTP_PORT = String(port);

  return new Promise<void>((resolve, reject) => {
    mockSmtpServer.listen({host: '127.0.0.1', port}, () => {
      resolve();
    });
    mockSmtpServer.on('error', err => reject(err));
  });
}
function stopMockSmtpServer() {
  return new Promise<void>(resolve => {
    mockSmtpServer.close(() => {
      resolve();
    });
  });
}

function makeRequest(method: 'get' | 'post', apiPath: string, app: INestApplication, token?: string) {
  let req = request(app.getHttpServer())[method](apiPath);
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  return req;
}

export function POST(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('post', apiPath, app, token);
}

export function GET(apiPath: string, app: INestApplication, token?: string) {
  return makeRequest('get', apiPath, app, token);
}
