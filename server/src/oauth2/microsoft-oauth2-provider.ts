import * as fs from 'fs';
import {
  createHash,
  randomBytes as randomBytesCb,
  randomInt as randomIntCb,
  X509Certificate,
} from 'crypto';
import { promisify } from 'util';
import { ConfigService } from "@nestjs/config";
import { sign as jwtSignCb } from 'jsonwebtoken';
import type { EnvironmentVariables } from "../env.validation";
import type {
  IOAuth2Provider,
  OAuth2Config,
  PartialAuthzQueryParams,
  PartialRefreshParams,
  PartialTokenFormParams,
} from "./oauth2.service";
import {
  OAuth2InvalidStateError,
  OAuth2InvalidOrExpiredNonceError,
} from "./oauth2.service";
import { OAuth2ProviderType, oidcScopes } from './oauth2-common';
import { SECONDS_PER_MINUTE } from '../rate-limiter';
import User from "../users/user.entity";
import MicrosoftOAuth2 from './microsoft-oauth2.entity';
import Cacher from '../cacher';
import { getSecondsSinceUnixEpoch } from 'src/dates.utils';

const randomBytes: (size: number) => Promise<Buffer> = promisify(randomBytesCb);
const randomInt: (max: number) => Promise<number> = promisify(randomIntCb);

function jwtSign(
  payload: Parameters<typeof jwtSignCb>[0],
  secretOrPrivateKey: Parameters<typeof jwtSignCb>[1],
  options?: Parameters<typeof jwtSignCb>[2],
): Promise<string> {
  return new Promise((resolve, reject) => {
    jwtSignCb(payload, secretOrPrivateKey, options, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
}

// See https://learn.microsoft.com/en-us/graph/api/resources/calendar?view=graph-rest-1.0&preserve-view=true
const microsoftCalendarScopes = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
];
function createOAuth2Config(tenantID: string): OAuth2Config {
  return {
    // See https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration
    authzEndpoint: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
    scopes: [
      ...oidcScopes,
      'offline_access',
      ...microsoftCalendarScopes,
    ]
  };
}

// See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#request-an-access-token-with-a-certificate-credential
const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

// See https://www.oauth.com/oauth2-servers/pkce/authorization-request/
const pkceCodeVerifierValidChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const pkceCodeVerifierLength = 43;
const codeChallengeLifetimeSeconds = 5 * SECONDS_PER_MINUTE;
async function generatePkceCodeVerifier(): Promise<string> {
  const arr = Array<string>(pkceCodeVerifierLength);
  for (let i = 0; i < pkceCodeVerifierLength; i++) {
    const randomIdx = await randomInt(pkceCodeVerifierValidChars.length);
    arr[i] = pkceCodeVerifierValidChars[randomIdx];
  }
  return arr.join('');
}
function generatePkceCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

// See https://learn.microsoft.com/en-us/azure/active-directory/develop/active-directory-certificate-credentials#header
function certificateToX5t(pemEncodedCert: string): string {
  const {fingerprint} = new X509Certificate(pemEncodedCert);
  // fingerprint looks like "E9:BE:7B:B0:60:7D:33:..."
  return Buffer.from(fingerprint.replace(/:/g, ''), 'hex').toString('base64url');
}

type MicrosoftOAuth2EnvConfig = {
  client_id: string;
  redirect_uri: string;
  private_key: Buffer;
};

export default class MicrosoftOAuth2Provider implements IOAuth2Provider {
  public readonly type = OAuth2ProviderType.MICROSOFT;
  private readonly oauth2Config: OAuth2Config;
  private readonly envConfig: MicrosoftOAuth2EnvConfig | undefined;
  private readonly x5t: string | undefined;
  // Map each nonce to a code verifier. The nonce is stored in the 'state'
  // parameter passed to the authorization endpoint.
  private readonly codeVerifierCache = new Cacher<string>();

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const tenantID = configService.get('OAUTH2_MICROSOFT_TENANT_ID', {infer: true});
    this.oauth2Config = createOAuth2Config(tenantID);
    const client_id = configService.get('OAUTH2_MICROSOFT_CLIENT_ID', {infer: true});
    const certificate_path = configService.get('OAUTH2_MICROSOFT_CERTIFICATE_PATH', {infer: true});
    const private_key_path = configService.get('OAUTH2_MICROSOFT_PRIVATE_KEY_PATH', {infer: true});
    const redirect_uri = configService.get('OAUTH2_MICROSOFT_REDIRECT_URI', {infer: true});
    if (client_id && private_key_path && redirect_uri && certificate_path) {
      const certificate = fs.readFileSync(certificate_path, {encoding: 'utf8'});
      this.x5t = certificateToX5t(certificate);
      const private_key = fs.readFileSync(private_key_path);
      this.envConfig = {client_id, redirect_uri, private_key};
    }
  }

  isConfigured(): boolean {
    return !!this.envConfig;
  }

  getStaticOAuth2Config(): OAuth2Config {
    return this.oauth2Config;
  }

  getScopesToExpectInResponse(): string[] {
    // Note that 'offline_access' will not be returned in the response
    return [
      ...oidcScopes,
      ...microsoftCalendarScopes,
    ]
  }

  async getPartialAuthzQueryParams(): Promise<PartialAuthzQueryParams> {
    const nonce = (await randomBytes(16)).toString('base64url');
    const codeVerifier = await generatePkceCodeVerifier();
    const codeChallenge = generatePkceCodeChallenge(codeVerifier);
    this.codeVerifierCache.add(nonce, codeVerifier, codeChallengeLifetimeSeconds);
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      // This gets inserted into the 'state' parameter
      // See OAuth2Service.getRequestURL()
      serverNonce: nonce,
    };
  }

  // See https://learn.microsoft.com/en-us/azure/active-directory/develop/active-directory-certificate-credentials
private generateClientAssertion(privateKey: Buffer, clientID: string): Promise<string> {
  const now = getSecondsSinceUnixEpoch();
  const header = {
    alg: 'RS256' as const,
    typ: 'JWT',
    x5t: this.x5t,
  };
  const payload = {
    aud: this.oauth2Config.tokenEndpoint,
    exp: now + 5 * SECONDS_PER_MINUTE,
    iss: clientID,
    nbf: now,
    sub: clientID,
    iat: now,
  };
  return jwtSign(payload, privateKey, {algorithm: header.alg, header});
}

  async getPartialTokenFormParams(nonce?: string): Promise<PartialTokenFormParams> {
    if (!nonce) throw new OAuth2InvalidStateError();
    const codeVerifier = this.codeVerifierCache.getAndPop(nonce);
    if (!codeVerifier) {
      throw new OAuth2InvalidOrExpiredNonceError();
    }
    // See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#request-an-access-token-with-a-certificate-credential
    const clientAssertion = await this.generateClientAssertion(this.envConfig.private_key!, this.envConfig.client_id!);
    return {
      client_id: this.envConfig!.client_id,
      redirect_uri: this.envConfig!.redirect_uri,
      code_verifier: codeVerifier,
      client_assertion_type: CLIENT_ASSERTION_TYPE,
      client_assertion: clientAssertion,
    };
  }

  async getPartialRefreshParams(): Promise<PartialRefreshParams> {
    const clientAssertion = await this.generateClientAssertion(this.envConfig.private_key!, this.envConfig.client_id!);
    return {
      client_id: this.envConfig!.client_id,
      client_assertion_type: CLIENT_ASSERTION_TYPE,
      client_assertion: clientAssertion,
    };
  }

  setLinkedCalendarToTrue(user: User): void {
    user.MicrosoftOAuth2 = {LinkedCalendar: true} as MicrosoftOAuth2;
  }
}
