import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { Database } from 'better-sqlite3';
import type { DataSourceOptions } from 'typeorm';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import type { EnvironmentVariables } from './env.validation';

// TODO: if using Postgres, make sure to use REPEATABLE READ

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

function checkEnvVarsExist(vars: (keyof EnvironmentVariables)[], getEnv: (key: keyof EnvironmentVariables) => string) {
  for (const varname of vars) {
    if (!getEnv(varname)) {
      throw new Error('Please set the environment variable ' + varname);
    }
  }
}

export function createDataSourceOptions(
  getEnv: (key: keyof EnvironmentVariables) => string,
  cli: boolean,
): DataSourceOptions {
  const nodeEnv = getEnv('NODE_ENV');
  const dbType = getEnv('DATABASE_TYPE');
  const commonOptions: Writable<
    Omit<TypeOrmModuleOptions, 'type' | 'database' | 'poolSize'>
  > = {};
  if (cli || nodeEnv === 'development') {
    commonOptions.logging = true;
  }
  if (cli) {
    commonOptions.entities = ['src/**/*.entity.ts'];
  } else {
    commonOptions.autoLoadEntities = true;
  }
  if (!cli && nodeEnv === 'development') {
    commonOptions.synchronize = true;
  } else {
    commonOptions.migrations = [`migrations/${dbType}/*.js`];
    commonOptions.migrationsRun = true;
  }
  if (dbType === 'sqlite') {
    checkEnvVarsExist(['SQLITE_PATH'], getEnv);
    return {
      type: 'better-sqlite3',
      database: getEnv('SQLITE_PATH'),
      ...commonOptions,
    };
  } else if (dbType === 'mysql') {
    checkEnvVarsExist(['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'], getEnv);
    return {
      type: 'mysql',
      host: getEnv('MYSQL_HOST'),
      port: +getEnv('MYSQL_PORT'),
      username: getEnv('MYSQL_USER'),
      password: getEnv('MYSQL_PASSWORD'),
      database: getEnv('MYSQL_DATABASE'),
      charset: 'utf8mb4',
      ...commonOptions,
    };
  } else {
    // TODO: PostgreSQL
    throw new Error('Unrecognized database type ' + dbType);
  }
}

export default (
  configService: ConfigService<EnvironmentVariables, true>,
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const options = createDataSourceOptions((key: keyof EnvironmentVariables) => configService.get(key), false);
  if (options.type === 'better-sqlite3') {
    (options as Writable<BetterSqlite3ConnectionOptions>).prepareDatabase = (db: Database) => {
      if (nodeEnv === 'test') {
        db.pragma('journal_mode = MEMORY');
      } else {
        // See https://www.sqlite.org/pragma.html#pragma_synchronous
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
      }
    };
  }
  return options;
};
