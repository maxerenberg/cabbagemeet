import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../env.validation";
import type {
  IOAuth2Provider,
  OAuth2Config,
  PartialAuthzQueryParams,
  PartialRefreshParams,
  PartialTokenFormParams,
} from "./oauth2.service";
import { OAuth2ProviderType, oidcScopes } from './oauth2-common';
import User from "../users/user.entity";
import GoogleOAuth2 from "./google-oauth2.entity";

const googleOidcScopes = [
  'openid',
  // Note that these are different from the standard OIDC scope names
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];
const googleCalendarScopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.owned',
];
const oauth2Config: OAuth2Config = {
  // See https://developers.google.com/identity/protocols/oauth2/web-server
  //     https://accounts.google.com/.well-known/openid-configuration
  authzEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
  scopes: [
    ...oidcScopes,
    ...googleCalendarScopes,
  ],
};

type GoogleOAuth2EnvConfig = {
  client_id: string;
  secret: string;
  redirect_uri: string;
};

export default class GoogleOAuth2Provider implements IOAuth2Provider {
  public readonly type = OAuth2ProviderType.GOOGLE;
  private readonly envConfig: GoogleOAuth2EnvConfig | undefined;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const client_id = configService.get('OAUTH2_GOOGLE_CLIENT_ID', {infer: true});
    const secret = configService.get('OAUTH2_GOOGLE_CLIENT_SECRET', {infer: true});
    const redirect_uri = configService.get('OAUTH2_GOOGLE_REDIRECT_URI', {infer: true});
    if (client_id && secret && redirect_uri) {
      this.envConfig = {client_id, secret, redirect_uri};
    }
  }

  isConfigured(): boolean {
    return !!this.envConfig;
  }

  getStaticOAuth2Config(): OAuth2Config {
    return oauth2Config;
  }

  getScopesToExpectInResponse(): string[] {
    return [
      ...googleOidcScopes,
      ...googleCalendarScopes,
    ];
  }

  async getPartialAuthzQueryParams(): Promise<PartialAuthzQueryParams> {
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      access_type: 'offline',
    };
  }

  async getPartialTokenFormParams(): Promise<PartialTokenFormParams> {
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      client_secret: this.envConfig!.secret,
    };
  }

  async getPartialRefreshParams(): Promise<PartialRefreshParams> {
    return {
      client_id: this.envConfig!.client_id,
      client_secret: this.envConfig!.secret,
    };
  }

  setLinkedCalendarToTrue(user: User): void {
    user.GoogleOAuth2 = {LinkedCalendar: true} as GoogleOAuth2;
  }
}
