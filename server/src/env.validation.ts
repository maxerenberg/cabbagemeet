// Adapted from https://docs.nestjs.com/techniques/configuration#custom-validate-function

import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPort,
  IsPositive,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';
import { stripTrailingSlash } from './misc.utils';

// Adapted from https://stackoverflow.com/a/68800520
const environments = ['development', 'production', 'test'] as const;
type Environment = typeof environments[number];

const databaseTypes = ['sqlite', 'mysql', 'postgres'] as const;
export type DatabaseType = typeof databaseTypes[number];

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
  HOST?: string = 'localhost';

  // The public-facing URL of this server.
  // Will be used when creating Google calendar events and sending emails.
  @IsUrl({require_tld: false})
  PUBLIC_URL: string;

  @IsOptional()
  @IsString()
  JWT_SIGNING_KEY?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  HOURLY_MEETING_CREATION_LIMIT_PER_IP?: number = 100;

  @IsOptional()
  @IsInt()
  @IsPositive()
  DELETE_MEETINGS_OLDER_THAN_NUM_DAYS?: number = 60;

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

  // Should be set to true if this app is behind a reverse proxy AND the proxy
  // has been configured to set the X-Forwarded-For header
  @IsOptional()
  @IsBoolean()
  TRUST_PROXY?: boolean = false;

  @IsOptional()
  @IsBoolean()
  VERIFY_SIGNUP_EMAIL_ADDRESS?: boolean = true;

  // Make sure that this is an IP address if it is not resolvable via
  // an external resolver (e.g. something in /etc/hosts).
  // See https://nodemailer.com/smtp/ for an explanation.
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsPort()
  SMTP_PORT?: string;

  @IsOptional()
  @IsEmail({allow_display_name: false, require_tld: false})
  SMTP_FROM?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  EMAIL_DAILY_LIMIT?: number = 100;

  @IsOptional()
  @IsBoolean()
  SIGNUP_REQUIRES_EMAIL_VALIDATION?: boolean = true;
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
  if (validatedConfig.DATABASE_TYPE === 'sqlite') {
    if (!validatedConfig.SQLITE_PATH) {
      throw new Error(
        'SQLITE_PATH must be specified for sqlite database type',
      );
    }
  } else {
    // TODO: add more databases
    throw new Error('Unsupported database ' + validatedConfig.DATABASE_TYPE);
  }
  validatedConfig.PUBLIC_URL = stripTrailingSlash(validatedConfig.PUBLIC_URL);
  return validatedConfig;
}
