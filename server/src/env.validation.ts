// Adapted from https://docs.nestjs.com/techniques/configuration#custom-validate-function

import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPort,
  IsPositive,
  IsString,
  validateSync,
} from 'class-validator';

// Adapted from https://stackoverflow.com/a/68800520
const environments = ['development', 'production', 'test'] as const;
type Environment = typeof environments[number];

const databaseTypes = ['sqlite', 'mysql', 'postgres'] as const;
type DatabaseType = typeof databaseTypes[number];

export class EnvironmentVariables {
  @IsIn(environments)
  NODE_ENV: Environment;

  // Needs to be a string for IsPort() to work
  // Port 3000 is already used by Create-React-App, so use 3001 instead
  @IsOptional()
  @IsPort()
  PORT?: string = '3001';

  // The IP address or hostname to which the listening socket should be bound
  @IsOptional()
  @IsString()
  HOST?: string = '127.0.0.1';

  // The public-facing URL of this server. Will be used when creating Google calendar events.
  @IsOptional()
  @IsString()
  PUBLIC_URL?: string = '';

  @IsOptional()
  @IsString()
  JWT_SIGNING_KEY?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  MAX_MEETINGS_PER_USER?: number = 100;

  @IsIn(databaseTypes)
  DATABASE_TYPE: DatabaseType;

  @IsOptional()
  @IsString()
  SQLITE_PATH?: string;

  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_REDIRECT_URI?: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { whitelist: true });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  if (
    validatedConfig.DATABASE_TYPE === 'sqlite' &&
    !validatedConfig.SQLITE_PATH
  ) {
    throw new Error(
      'SQLITE_PATH must be specified for sqlite database type',
    );
  }
  return validatedConfig;
}
