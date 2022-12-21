import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { validate as validateEnv } from './src/config/env.validation';
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
} else {
  // Needed to prevent the validateEnv from failing (shouldn't actually be used anywhere)
  process.env.NODE_ENV = 'production';
}
if (!process.env.PUBLIC_URL) {
  // Needed to prevent the validateEnv from failing
  process.env.PUBLIC_URL = 'http://cabbagemeet.internal';
}

const envVars = validateEnv(process.env);
const dataSourceOptions = createDataSourceOptions((key) => envVars[key], true);

export const AppDataSource = new DataSource(dataSourceOptions);
