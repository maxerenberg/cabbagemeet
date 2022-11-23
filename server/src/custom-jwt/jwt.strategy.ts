import * as crypto from 'crypto';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DbconfigService } from '../dbconfig/dbconfig.service';
import { EnvironmentVariables } from '../env.validation';
import User from '../users/user.entity';
import UsersService from '../users/users.service';
import { getSecondsSinceUnixEpoch } from '../dates.utils';
import { Request } from 'express';
import Cacher from '../cacher';

export async function getJWTSigningKey(
  configService: ConfigService<EnvironmentVariables, true>,
  dbconfigService: DbconfigService,
): Promise<string> {
  const keyName = 'JWT_SIGNING_KEY';
  const keyFromEnv = configService.get(keyName, { infer: true });
  if (keyFromEnv) {
    return keyFromEnv;
  }
  const keyFromDb = await dbconfigService.get(keyName);
  if (keyFromDb) {
    return keyFromDb;
  }
  // Need to generate a new key
  const newKey = crypto.randomBytes(32).toString('base64');
  await dbconfigService.set(keyName, newKey);
  return newKey;
}

export type TokenPurpose = 'pwreset';
export type SerializedUserJwt = {
  sub: string;  // user ID
  iat: number;  // when the JWT was created (seconds since Unix epoch)

  // Custom claims
  cabbagemeet__token_purpose?: TokenPurpose;
}

const PWRESET_TOKEN_LIFETIME_SECONDS = 4 * 60 * 60;

@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy) {
  private jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
  private cacher = new Cacher();

  constructor(
    @Inject('JWT_SIGNING_KEY') secret: string,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: SerializedUserJwt): Promise<User | null> {
    const user = await this.usersService.findOneByID(+payload.sub);
    if (user === null) {
      return null;
    }
    if (payload.cabbagemeet__token_purpose === 'pwreset') {
      const now = getSecondsSinceUnixEpoch();
      if (now - payload.iat > PWRESET_TOKEN_LIFETIME_SECONDS) {
        return null;
      }
      const token = this.jwtFromRequest(req);
      if (this.cacher.has(token)) {
        // password reset tokens may not be re-used
        return null;
      }
      this.cacher.add(token, PWRESET_TOKEN_LIFETIME_SECONDS);
    } else {
      if (
        user.TimestampOfEarliestValidToken === null
        || payload.iat < user.TimestampOfEarliestValidToken
      ) {
        return null;
      }
    }
    return user;
  }

  serializeUserToJwt(user: User, purpose?: TokenPurpose): {
    payload: SerializedUserJwt,
    token: string,
  } {
    const payload: SerializedUserJwt = {
      sub: String(user.ID),
      iat: getSecondsSinceUnixEpoch(),
    };
    if (purpose) {
      payload.cabbagemeet__token_purpose = purpose;
    }
    const token = this.jwtService.sign(payload);
    return {payload, token};
  }
}
