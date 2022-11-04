import { Inject, Injectable } from '@nestjs/common';
import User from '../users/user.entity';
import { decryptText, encryptText } from './encryption';
import JwtStrategy from './jwt.strategy';

@Injectable()
export default class CustomJwtService {
  constructor(
    @Inject('JWT_SIGNING_KEY') private secret: string,
    private jwtStrategy: JwtStrategy,
  ) {}

  serializeUserToJwt(user: User): string {
    return this.jwtStrategy.serializeUserToJwt(user);
  }

  // For convenience's sake, we will re-use the JWT secret for encryption.
  // I don't think that this is a problem because if the JWT secret is
  // leaked, we're screwed anyways.

  async encryptText(text: string): Promise<{
    encrypted: Buffer;
    iv: Buffer;
    salt: Buffer;
  }> {
    return encryptText(text, this.secret);
  }

  async decryptText(encrypted: Buffer, iv: Buffer, salt: Buffer): Promise<string> {
    return decryptText(encrypted, iv, salt, this.secret);
  }
}
