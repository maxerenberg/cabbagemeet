import { Inject, Injectable } from '@nestjs/common';
import User from '../users/user.entity';
import { decryptText, encryptText } from './encryption';
import JwtStrategy, { TokenPurpose } from './jwt.strategy';

@Injectable()
export default class CustomJwtService {
  constructor(
    @Inject('JWT_SIGNING_KEY') private secret: string,
    private jwtStrategy: JwtStrategy,
  ) {}

  serializeUserToJwt(user: User, purpose?: TokenPurpose) {
    return this.jwtStrategy.serializeUserToJwt(user, purpose);
  }

  // For convenience's sake, we will re-use the JWT secret for encryption.
  // I don't think that this is a problem because if the JWT secret is
  // leaked, we're screwed anyways.

  encryptText(text: string) {
    return encryptText(text, this.secret);
  }

  decryptText(encrypted: Buffer, iv: Buffer, salt: Buffer, tag: Buffer) {
    return decryptText(encrypted, iv, salt, tag, this.secret);
  }
}
