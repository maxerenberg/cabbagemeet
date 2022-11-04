import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { Database } from 'better-sqlite3';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import { EnvironmentVariables } from './env.validation';

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

// TODO: if using Postgres, make sure to use REPEATABLE READ

export default (
  configService: ConfigService<EnvironmentVariables, true>,
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const envDatabaseType = configService.get('DATABASE_TYPE', { infer: true });
  const databaseType = (
    {
      sqlite: 'better-sqlite3',
      mysql: 'mysql',
      postgres: 'postgres',
    } as const
  )[envDatabaseType];
  if (databaseType === undefined) {
    throw new Error(`Invalid database type ${envDatabaseType}`);
  }
  const options: Writable<TypeOrmModuleOptions> = {
    type: databaseType,
    autoLoadEntities: true,
    //entities: ['dist/**/*.entity.js'],
  };
  if (databaseType === 'better-sqlite3') {
    options.database = configService.get('SQLITE_PATH', {infer: true});
    (options as Writable<BetterSqlite3ConnectionOptions>).prepareDatabase = (db: Database) => {
      if (nodeEnv === 'test') {
        db.pragma('journal_mode = MEMORY');
      } else {
        // See https://www.sqlite.org/pragma.html#pragma_synchronous
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
      }
    };
  } else {
    throw new Error(`Database type ${envDatabaseType} is not supported yet`);
  }
  if (nodeEnv === 'development') {
    options.logging = 'all';
    options.synchronize = true;
  } else {
    options.migrations = [`migrations/${envDatabaseType}/*.js`];
    options.migrationsRun = true;
  }
  return options;
};
