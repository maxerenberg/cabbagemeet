import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { EnvironmentVariables } from './src/env.validation';
import { createDataSourceOptions } from './src/database-options-factory';

if (process.env.NODE_ENV) {
  const envPath = ({
    'development': '.development.env',
    'production': '.env',
  } as const)[process.env.NODE_ENV];
  if (!envPath) {
    throw new Error('Please set NODE_ENV to "development" or "production".');
  }
  dotenv.config({ path: envPath });
}

const dataSourceOptions = createDataSourceOptions((key: keyof EnvironmentVariables) => process.env[key], true);

export const AppDataSource = new DataSource(dataSourceOptions);
