// Adapted from https://docs.nestjs.com/techniques/configuration#custom-validate-function

import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPort,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { stripTrailingSlash } from '../misc.utils';

// Adapted from https://stackoverflow.com/a/68800520
const environments = ['development', 'production', 'test'] as const;
export type Environment = typeof environments[number];

// TODO: support MySQL too
const databaseTypes = ['sqlite', 'mariadb', 'postgres'] as const;
export type DatabaseType = typeof databaseTypes[number];

// See https://github.com/validatorjs/validator.js/blob/master/src/lib/isBoolean.js
const booleanTrueStrings = ['true', '1', 'yes'];
export function isBooleanStringTrue(s: string) {
  return booleanTrueStrings.includes(s.toLowerCase());
}

// WARNING: do not use the boolean type; boolean strings are not actually
// converted into booleans.
// See https://github.com/typestack/class-transformer/issues/626.
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
  @IsUrl({ require_tld: false })
  PUBLIC_URL: string;

  @IsOptional()
  @IsString()
  JWT_SIGNING_KEY?: string;

  // Set to 0 for no limit
  @IsOptional()
  @IsInt()
  @Min(0)
  HOURLY_MEETING_CREATION_LIMIT_PER_IP?: number = 100;

  // Set to 0 to disable automatic deletions
  @IsOptional()
  @IsInt()
  @Min(0)
  DELETE_MEETINGS_OLDER_THAN_NUM_DAYS?: number = 60;

  @IsIn(databaseTypes)
  DATABASE_TYPE: DatabaseType;

  @IsOptional()
  @IsString()
  SQLITE_PATH?: string;

  @IsOptional()
  @IsString()
  MYSQL_HOST?: string;

  @IsOptional()
  @IsPort()
  MYSQL_PORT?: string;

  @IsOptional()
  @IsString()
  MYSQL_USER?: string;

  @IsOptional()
  @IsString()
  MYSQL_PASSWORD?: string;

  @IsOptional()
  @IsString()
  MYSQL_DATABASE?: string;

  @IsOptional()
  @IsString()
  POSTGRES_HOST?: string;

  @IsOptional()
  @IsPort()
  POSTGRES_PORT?: string;

  @IsOptional()
  @IsString()
  POSTGRES_USER?: string;

  @IsOptional()
  @IsString()
  POSTGRES_PASSWORD?: string;

  @IsOptional()
  @IsString()
  POSTGRES_DATABASE?: string;

  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_CLIENT_ID?: string;

  // Path to a certificate used for PKCE (must be PEM-encoded)
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_CERTIFICATE_PATH?: string;

  // Path to a private key used for PKCE (must be PEM-encoded)
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_PRIVATE_KEY_PATH?: string;

  // See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc#find-your-apps-openid-configuration-document-uri
  // Use 'common' if both work/school and personal Microsoft accounts can be used and
  // 'consumers' if only personal Microsoft accounts can be used
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_TENANT_ID?: string = 'consumers';

  // Should be set to true if this app is behind a reverse proxy AND the proxy
  // has been configured to set the X-Forwarded-For header
  @IsOptional()
  @IsBooleanString()
  TRUST_PROXY?: string = 'false';

  @IsOptional()
  @IsBooleanString()
  VERIFY_SIGNUP_EMAIL_ADDRESS?: string = 'true';

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
  @IsEmail({ allow_display_name: false, require_tld: false })
  SMTP_FROM?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  // Set to 0 for no limit
  @IsOptional()
  @IsInt()
  @Min(0)
  EMAIL_DAILY_LIMIT?: number = 100;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsPort()
  REDIS_PORT?: string = '6379';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(15)
  REDIS_DATABASE?: number = 0;
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
  validatedConfig.PUBLIC_URL = stripTrailingSlash(validatedConfig.PUBLIC_URL);
  return validatedConfig;
}
