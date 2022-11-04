import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

let envPath = ({
  'development': '.development.env',
  'test': '.test.env',
  'production': '.env',
} as const)[process.env.NODE_ENV];
if (!envPath) {
  throw new Error('Please set NODE_ENV to "development" or "production".');
}
dotenv.config({ path: envPath });

const dbType = process.env.DATABASE_TYPE;
const commonOptions = {
  entities: ['src/**/*.entity.ts'],
  migrations: [`migrations/${dbType}/*.js`],
  logging: true,
};
const dataSourceOptions: DataSourceOptions | undefined =
  dbType === 'sqlite'
  ? {
    type: 'better-sqlite3',
    database: process.env.SQLITE_PATH,
    ...commonOptions,
  }
  : undefined;

if (!dataSourceOptions) {
  throw new Error('Please set DATABASE_TYPE to one of "sqlite", "mysql" or "postgres".')
}

export const AppDataSource = new DataSource(dataSourceOptions);
