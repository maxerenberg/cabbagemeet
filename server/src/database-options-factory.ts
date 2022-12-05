import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { Database } from 'better-sqlite3';
import { DataSourceOptions } from 'typeorm';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import { injectTypeOrmColumns as mysql_injectTypeOrmColumns } from './custom-columns/inject-columns-mysql';
import { injectTypeOrmColumns as sqlite_injectTypeOrmColumns } from './custom-columns/inject-columns-sqlite';
import type { DatabaseType, EnvironmentVariables } from './env.validation';

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
  const dbType = getEnv('DATABASE_TYPE') as DatabaseType;
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
  const customMigrationsGlobPath = `dist/src/custom-migrations/${dbType}/*-Migration.js`;
  if (!cli && nodeEnv === 'development') {
    commonOptions.synchronize = true;
    commonOptions.migrations = [customMigrationsGlobPath];
    // We can't run the custom migrations here unfortunately, because they will run
    // BEFORE the synchronize step, but our migrations need the tables to be created
    // first. So we need to explicitly run them later, in the CustomMigrationsService.
    commonOptions.migrationsRun = false;
  } else {
    commonOptions.migrations = [`migrations/${dbType}/*.js`, customMigrationsGlobPath];
    commonOptions.migrationsRun = true;
  }
  if (dbType === 'sqlite') {
    sqlite_injectTypeOrmColumns();
    checkEnvVarsExist(['SQLITE_PATH'], getEnv);
    return {
      type: 'better-sqlite3',
      database: getEnv('SQLITE_PATH'),
      ...commonOptions,
    };
  } else if (dbType === 'mariadb') {
    mysql_injectTypeOrmColumns();
    checkEnvVarsExist(['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'], getEnv);
    return {
      type: 'mariadb',
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
