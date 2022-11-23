import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EnvironmentVariables } from '../env.validation';
import RateLimiter from '../rate-limiter';

const KEY = 'mail';

export interface SendParams {
  recipient: string;
  subject: string;
  body: string;
}

@Injectable()
export default class MailService {
  private transport: nodemailer.Transporter = undefined;
  private readonly logger = new Logger(MailService.name);
  private readonly rateLimiter = new RateLimiter();

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.rateLimiter.setLimits({
      hourly: configService.get('EMAIL_HOURLY_LIMIT', {infer: true}),
      daily: configService.get('EMAIL_DAILY_LIMIT', {infer: true}),
    });
    const smtpHost = configService.get('SMTP_HOST', {infer: true});
    const smtpPort = +configService.get('SMTP_PORT', {infer: true});
    const smtpFrom = configService.get('SMTP_FROM', {infer: true});
    const smtpUser = configService.get('SMTP_USER', {infer: true});
    const smtpPass = configService.get('SMTP_PASSWORD', {infer: true});
    const transportOptions: SMTPTransport.Options = {
      port: smtpPort,
      host: smtpHost,
      connectionTimeout: 10,
    };
    if (smtpUser && smtpPass) {
      transportOptions.auth = {
        user: smtpUser,
        pass: smtpPass,
      };
    }
    if (smtpPort === 465) {
      transportOptions.secure = true;
    }
    if (process.env.NODE_ENV === 'production') {
      transportOptions.requireTLS = true;
    }
    if (smtpHost && smtpPort && smtpFrom) {
      this.transport = nodemailer.createTransport(transportOptions, {
        from: `CabbageMeet <${smtpFrom}>`,
      });
    }
  }

  isConfigured(): boolean {
    return this.transport !== undefined;
  }

  private async sendNow({recipient, subject, body}: SendParams) {
    this.logger.debug(`Sending to=${recipient} (subject="${subject}")`);
    await this.transport.sendMail({
      to: recipient,
      subject,
      text: body,
    });
  }

  private async trySendNow(args: SendParams): Promise<boolean> {
    try {
      await this.sendNow(args);
      return true;
    } catch (err: any) {
      this.logger.error(err);
      return false;
    }
  }

  sendNowOrLater(args: SendParams) {
    this.rateLimiter.addOrDeferRequest(KEY, () => this.trySendNow(args));
  }

  async sendNowIfAllowed(args: SendParams): Promise<boolean> {
    if (this.rateLimiter.tryAddRequestIfWithinLimits(KEY)) {
      return this.trySendNow(args);
    }
    return false;
  }
}
