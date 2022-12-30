import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { Database } from 'better-sqlite3';
import type { DataSourceOptions } from 'typeorm';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import ConfigService from './config/config.service';
import { registerJoinColumns } from './custom-columns/custom-join-column';
import { injectTypeOrmColumns as mysql_injectTypeOrmColumns } from './custom-columns/mysql-inject-columns';
import type { EnvironmentVariables } from './config/env.validation';
import LowerCaseNamingStrategy from './lower-case-naming-strategy';

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

function checkEnvVarsExist(
  vars: (keyof EnvironmentVariables)[],
  getEnv: InstanceType<typeof ConfigService>['get'],
) {
  for (const varname of vars) {
    if (!getEnv(varname)) {
      throw new Error('Please set the environment variable ' + varname);
    }
  }
}

export function createDataSourceOptions(
  getEnv: InstanceType<typeof ConfigService>['get'],
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
  if (nodeEnv === 'test') {
    commonOptions.retryAttempts = 0;
  }
  const customMigrationsGlobPath = `dist/src/custom-migrations/${dbType}/*-Migration.js`;
  if (cli) {
    commonOptions.entities = ['src/**/*.entity.ts'];
  } else {
    commonOptions.autoLoadEntities = true;
    if (nodeEnv === 'development') {
      commonOptions.synchronize = true;
      commonOptions.migrations = [customMigrationsGlobPath];
      // We can't run the custom migrations here unfortunately, because they will run
      // BEFORE the synchronize step, but our migrations need the tables to be created
      // first. So we need to explicitly run them later, in the CustomMigrationsService.
      commonOptions.migrationsRun = false;
    }
  }
  if (cli || nodeEnv !== 'development') {
    commonOptions.migrations = [
      `${cli ? '' : 'dist/'}migrations/${dbType}/*.js`,
      customMigrationsGlobPath,
    ];
    commonOptions.migrationsRun = true;
  }
  registerJoinColumns(dbType);
  if (dbType === 'sqlite') {
    checkEnvVarsExist(['SQLITE_PATH'], getEnv);
    return {
      type: 'better-sqlite3',
      database: getEnv('SQLITE_PATH'),
      ...commonOptions,
    };
  } else if (dbType === 'mariadb') {
    mysql_injectTypeOrmColumns();
    checkEnvVarsExist(
      [
        'MYSQL_HOST',
        'MYSQL_USER',
        'MYSQL_PASSWORD',
        'MYSQL_DATABASE',
      ],
      getEnv,
    );
    return {
      type: 'mariadb',
      host: getEnv('MYSQL_HOST'),
      port: +(getEnv('MYSQL_PORT') || 3306),
      username: getEnv('MYSQL_USER'),
      password: getEnv('MYSQL_PASSWORD'),
      database: getEnv('MYSQL_DATABASE'),
      charset: 'utf8mb4',
      ...commonOptions,
    };
  } else if (dbType === 'postgres') {
    checkEnvVarsExist(
      [
        'POSTGRES_HOST',
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'POSTGRES_DATABASE',
      ],
      getEnv,
    );
    return {
      type: 'postgres',
      host: getEnv('POSTGRES_HOST'),
      port: +(getEnv('POSTGRES_PORT') || 5432),
      username: getEnv('POSTGRES_USER'),
      password: getEnv('POSTGRES_PASSWORD'),
      database: getEnv('POSTGRES_DATABASE'),
      // In Postgres, unquoted identifiers are case-insensitive, but TypeORM quotes
      // all identifiers, so we want to make everything lower case so that we don't
      // need to place quotes in all of our queries
      namingStrategy: new LowerCaseNamingStrategy(),
      ...commonOptions,
    };
  } else {
    throw new Error('Unrecognized database type ' + dbType);
  }
}

export default function (configService: ConfigService): TypeOrmModuleOptions {
  const nodeEnv = configService.get('NODE_ENV');
  const options = createDataSourceOptions(
    configService.get.bind(configService),
    false,
  );
  if (options.type === 'better-sqlite3') {
    (options as Writable<BetterSqlite3ConnectionOptions>).prepareDatabase = (
      db: Database,
    ) => {
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
