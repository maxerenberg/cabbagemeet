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

type SerializedUserJwt = {
  sub: string;  // user ID
  iat: number;  // when the JWT was created (seconds since Unix epoch)
}

@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('JWT_SIGNING_KEY') secret: string,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: SerializedUserJwt): Promise<User | null> {
    return this.usersService.findOneByID(+payload.sub);
  }

  serializeUserToJwt(user: User): string {
    const payload: SerializedUserJwt = {
      sub: String(user.ID),
      iat: Math.floor(Date.now() / 1000),
    };
    return this.jwtService.sign(payload);
  }
}
