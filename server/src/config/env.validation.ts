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
  // One of 'development', 'production', or 'test'.
  // This is set automatically if you use one of the `npm run` scripts.
  @IsIn(environments)
  NODE_ENV: Environment;

  // The port on which the application will listen.
  @IsOptional()
  @IsPort()
  // Needs to be a string for IsPort() to work.
  // Port 3000 is already used by Create-React-App, so 3001 is chosen as the
  // default instead.
  PORT: string = '3001';

  // The IP address or hostname to which the listening socket should be bound.
  @IsOptional()
  @IsString()
  HOST: string = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  // The public-facing URL of the website.
  // Will be used when creating Google calendar events and sending emails.
  @IsUrl({ require_tld: false })
  PUBLIC_URL: string;

  // Allow requests from the origin of PUBLIC_URL.
  // This is useful if the static assets are being served from a different
  // origin than the API server, e.g. a CDN.
  // Make sure to also set REACT_APP_API_BASE_URL in the client when
  // creating the React build.
  @IsOptional()
  @IsBooleanString()
  ENABLE_CORS: string = 'false';

  // Folder from where static files are served
  @IsOptional()
  @IsString()
  // __dirname is like .../server/dist/src/config
  // This assumes that a folder named "client" is in the server directory
  STATIC_ROOT: string = __dirname + '/../../../client';

  // Key used for JWT signing and also for encryption of some URL parameters.
  // If unspecified, a new random key is created the first time the server
  // starts, and is saved in the database.
  @IsOptional()
  @IsString()
  JWT_SIGNING_KEY?: string;

  // The maximum number of meetings which can be created by requests
  // from a single IP address.
  // Set to 0 for no limit.
  // If the server is running behind a reverse proxy, make sure to set
  // TRUST_PROXY=true (see below).
  @IsOptional()
  @IsInt()
  @Min(0)
  HOURLY_MEETING_CREATION_LIMIT_PER_IP: number = 100;

  // Meetings older than this number of days will be automatically deleted
  // from the database to save storage space.
  // Set to 0 to disable automatic deletions.
  @IsOptional()
  @IsInt()
  @Min(0)
  DELETE_MEETINGS_OLDER_THAN_NUM_DAYS: number = 60;

  // Set to one of 'sqlite', 'mariadb' or 'postgres'.
  @IsIn(databaseTypes)
  DATABASE_TYPE: DatabaseType;

  // The path to a SQLite file.
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

  // The Google OAuth2 client ID to be used for authentication and
  // Google calendar integration.
  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_CLIENT_ID?: string;

  // The redirect URI used for Google OAuth2.
  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_REDIRECT_URI?: string;

  @IsOptional()
  @IsString()
  OAUTH2_GOOGLE_CLIENT_SECRET?: string;

  // The Microsoft OAuth2 client ID to be used for authentication and
  // Outlook calendar integration.
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_CLIENT_ID?: string;

  // The redirect URI used for Microsoft OAuth2.
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_REDIRECT_URI?: string;

  // Certificate used for PKCE (must be PEM-encoded)
  // This takes priority over OAUTH2_MICROSOFT_CERTIFICATE_PATH
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_CERTIFICATE?: string;

  // Path to a certificate used for PKCE (must be PEM-encoded)
  // This has no effect if OAUTH2_MICROSOFT_CERTIFICATE is set
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_CERTIFICATE_PATH?: string;

  // Private key used for PKCE (must be PEM-encoded)
  // This takes priority over OAUTH2_MICROSOFT_PRIVATE_KEY_PATH
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_PRIVATE_KEY?: string;

  // Path to a private key used for PKCE (must be PEM-encoded)
  // This has no effect if OAUTH2_MICROSOFT_PRIVATE_KEY is set
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_PRIVATE_KEY_PATH?: string;

  // See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc#find-your-apps-openid-configuration-document-uri
  // Use 'common' if both work/school and personal Microsoft accounts can be used and
  // 'consumers' if only personal Microsoft accounts can be used
  @IsOptional()
  @IsString()
  OAUTH2_MICROSOFT_TENANT_ID: string = 'consumers';

  // Should be set to true if this app is behind a reverse proxy AND the proxy
  // has been configured to set the X-Forwarded-For header
  @IsOptional()
  @IsBooleanString()
  TRUST_PROXY: string = 'false';

  // If set to true, users are sent a verification link to the email
  // address which they used when signing up.
  // If set to false, user accounts are created as soon as they sign up.
  @IsOptional()
  @IsBooleanString()
  VERIFY_SIGNUP_EMAIL_ADDRESS: string = 'true';

  // The Mail Transfer Agent to which emails will be sent.
  // If unspecified, all email-related functionality will be disabled
  // (including signup email verification).
  // Make sure that this is an IP address if it is not resolvable via
  // an external resolver (e.g. something in /etc/hosts).
  // See https://nodemailer.com/smtp/ for an explanation.
  @IsOptional()
  @IsString()
  SMTP_HOST: string;

  // Should be 25, 465 or 587.
  // Note that most cloud providers and ISP disable outoing traffic on
  // port 25.
  @IsOptional()
  @IsPort()
  SMTP_PORT?: string;

  // e.g. cabbagemeet@example.com
  @IsOptional()
  @IsEmail({ allow_display_name: false, require_tld: false })
  SMTP_FROM?: string;

  // Used for SMTP authentication
  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  // Used for SMTP authentication
  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  // The maximum number of emails which this server will send in a single day.
  // This is useful is using an SMTP relay service with a daily quota.
  // Set to 0 for no limit.
  @IsOptional()
  @IsInt()
  @Min(0)
  EMAIL_DAILY_LIMIT: number = 100;

  // If unspecified, an in-memory cache will be used.
  // Redis must be used if multiple instances of the application are running
  // simultaneously.
  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsPort()
  REDIS_PORT: string = '6379';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(15)
  REDIS_DATABASE: number = 0;
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
