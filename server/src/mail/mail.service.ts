import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EnvironmentVariables } from '../env.validation';
import RateLimiter, { SECONDS_PER_DAY, SECONDS_PER_MINUTE } from '../rate-limiter';

const KEY = 'mail';

export interface SendParams {
  recipient: string;
  subject: string;
  body: string;
}

function sleep(millis: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, millis);
  });
}

@Injectable()
export default class MailService {
  private transport: nodemailer.Transporter = undefined;
  private readonly logger = new Logger(MailService.name);
  private readonly rateLimiter: RateLimiter;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const dailyLimit = configService.get('EMAIL_DAILY_LIMIT', {infer: true});
    this.rateLimiter = new RateLimiter(SECONDS_PER_DAY, dailyLimit);
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

  async sendNowOrLater(args: SendParams) {
    const MAX_TRIES = 3;
    for (let i = 0; i < MAX_TRIES; i++) {
      if (this.rateLimiter.tryAddRequestIfWithinLimits(KEY)) {
        if (await this.trySendNow(args)) {
          return;
        }
      }
      if (i == MAX_TRIES - 1) {
        this.logger.warn(`Gave up trying to send email to ${args.recipient}`);
        return;
      }
      const jitter = Math.floor(Math.random() * 30);
      const seconds = (i + 1) * SECONDS_PER_MINUTE + jitter;
      await sleep(seconds * 1000);
    }
  }

  async sendNowIfAllowed(args: SendParams): Promise<boolean> {
    if (this.rateLimiter.tryAddRequestIfWithinLimits(KEY)) {
      return this.trySendNow(args);
    }
    return false;
  }
}
