import { randomInt as randomIntWithCb } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { EnvironmentVariables } from '../env.validation';
import User from '../users/user.entity';
import UsersService from '../users/users.service';
import LocalSignupDto from './local-signup.dto';
import MailService from '../mail/mail.service';
import CustomJwtService from '../custom-jwt/custom-jwt.service';
import Cacher from '../cacher';
import { SECONDS_PER_MINUTE } from '../rate-limiter';

const SALT_ROUNDS = 10;

// Unfortunately we can't use util.promisify on this one because the
// behaviour changes depending on the types of arguments passed
function randomInt(max: number): Promise<number> {
  return new Promise((resolve, reject) => {
    randomIntWithCb(max, (err, n) => {
      if (err) {
        reject(err);
      } else {
        resolve(n);
      }
    });
  });
}

@Injectable()
export default class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly publicURL: string;
  private readonly verificationCodes = new Cacher();

  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: CustomJwtService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.publicURL = configService.get('PUBLIC_URL', {infer: true});
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user === null) {
      return null;
    }
    if (!user.PasswordHash) {
      // Not present for users who signed up using OIDC
      return null;
    }
    if (!(await bcrypt.compare(password, user.PasswordHash))) {
      return null;
    }
    return user;
  }

  private createEmailVerificationEmailBody(name: string, verificationCode: string, expiresMinutes: number): string {
    return (
      `Hello ${name},\n` +
      '\n' +
      `Your verification code is: ${verificationCode}\n` +
      '\n' +
      `This code will expire in ${expiresMinutes} minutes.\n` +
      '\n' +
      '-- \n' +
      'CabbageMeet | ' + this.publicURL + '\n'
    );
  }

  async generateAndSendVerificationCode(name: string, email: string): Promise<boolean> {
    // We want a 6-digit code
    const code = await randomInt(1000000);
    const codeStr = String(code).padStart(6, '0');
    const expiresMinutes = 30;
    const sent = await this.mailService.sendNowIfAllowed({
      recipient: email,
      subject: 'CabbageMeet verification code',
      body: this.createEmailVerificationEmailBody(name, codeStr, expiresMinutes),
    });
    if (!sent) {
      return false;
    }
    this.verificationCodes.add(`${email}:${codeStr}`, SECONDS_PER_MINUTE * expiresMinutes);
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`verification code=${codeStr}`);
    }
    return true;
  }

  async signup({
    name,
    email,
    password,
    subscribe_to_notifications
  }: LocalSignupDto): Promise<User> {
    const user: Partial<User> = {
      Name: name,
      Email: email,
      IsSubscribedToNotifications: subscribe_to_notifications,
      PasswordHash: await bcrypt.hash(password, SALT_ROUNDS),
    };
    return this.usersService.create(user);
  }

  signupIfEmailIsVerified(signupArgs: LocalSignupDto, code: string): Promise<User | null> {
    if (!this.verificationCodes.pop(`${signupArgs.email}:${code}`)) {
      return null;
    }
    return this.signup(signupArgs);
  }

  private createPasswordResetEmailBody(user: User): string {
    const {token} = this.jwtService.serializeUserToJwt(user, 'pwreset');
    const url = this.publicURL + `/confirm-password-reset?pwresetToken=${token}`;
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`password reset URL=${url}`);
    }
    return (
      `Hello ${user.Name},\n` +
      '\n' +
      'Someone (hopefully you) recently requested a password reset for your ' +
      'CabbageMeet account. If this was you, please click the following link ' +
      'to proceed:\n' +
      '\n' +
      url +
      '\n' +
      'If this was not you, you may disregard this email.\n' +
      '\n' +
      '-- \n' +
      'CabbageMeet | ' + this.publicURL + '\n'
    );
  }

  async resetPassword(email: string) {
    if (!this.mailService.isConfigured()) {
      this.logger.warn('SMTP was not configured on this server');
      return;
    }
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      this.logger.debug(`User not found for email=${email}`);
      return;
    }
    this.mailService.sendNowOrLater({
      recipient: email,
      subject: 'CabbageMeet password reset',
      body: this.createPasswordResetEmailBody(user),
    });
  }

  async confirmResetPassword(user: User, newPassword: string) {
    await this.usersService.editUser(user.ID, {
      PasswordHash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      // sign out everywhere
      TimestampOfEarliestValidToken: null,
    });
  }
}
