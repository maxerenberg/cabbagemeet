import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';
import { EnvironmentVariables } from '../env.validation';
import User from '../users/user.entity';
import UsersService from '../users/users.service';
import LocalSignupDto from './local-signup.dto';
import MailService from '../mail/mail.service';
import RateLimiter from '../rate-limiter';
import CustomJwtService from '../custom-jwt/custom-jwt.service';
import { stripTrailingSlash } from '../misc.utils';

const SALT_ROUNDS = 10;

@Injectable()
export default class AuthService {
  private logger = new Logger();
  private pwresetRateLimiter = new RateLimiter();
  private readonly publicURL: string;

  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: CustomJwtService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    // A user can reset their password at most once every 10 minutes
    this.pwresetRateLimiter.setLimits({'ten-minutely': 1});
    this.publicURL = stripTrailingSlash(configService.get('PUBLIC_URL', {infer: true}));
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

  async signup({
    name,
    email,
    password,
    subscribe_to_notifications
  }: LocalSignupDto): Promise<User> {
    const user: DeepPartial<User> = {
      Name: name,
      Email: email,
      IsSubscribedToNotifications: subscribe_to_notifications,
      PasswordHash: await bcrypt.hash(password, SALT_ROUNDS),
    };
    return this.usersService.create(user);
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
    if (!this.pwresetRateLimiter.tryAddRequestIfWithinLimits(email)) {
      this.logger.debug(`User for email=${email} already reset password recently, ignoring`);
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
