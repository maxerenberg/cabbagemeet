import { Injectable, Logger } from '@nestjs/common';
import ConfigService from '../config/config.service';
import { SECONDS_PER_DAY, SECONDS_PER_MINUTE } from '../dates.utils';
import { sleep } from '../misc.utils';
import RateLimiterService, {
  IRateLimiter,
} from '../rate-limiter/rate-limiter.service';
import SMTPMailStrategy from './smtp-mail-strategy';

const KEY = 'mail';

export interface SendParams {
  recipient: string;
  subject: string;
  body: string;
}

export interface IMailStrategy {
  sendNow(params: SendParams): Promise<void>;
}

@Injectable()
export default class MailService {
  private strategy: IMailStrategy | undefined;
  private readonly logger = new Logger(MailService.name);
  private readonly rateLimiter: IRateLimiter | undefined;

  constructor(
    configService: ConfigService,
    rateLimiterService: RateLimiterService,
  ) {
    const dailyLimit = configService.get('EMAIL_DAILY_LIMIT');
    if (dailyLimit) {
      this.rateLimiter = rateLimiterService.factory(SECONDS_PER_DAY, dailyLimit);
    }
    if (configService.get('SMTP_HOST')) {
      this.strategy = new SMTPMailStrategy(configService);
    }
  }

  isConfigured(): boolean {
    return this.strategy !== undefined;
  }

  private async trySendNow(args: SendParams): Promise<boolean> {
    try {
      await this.strategy.sendNow(args);
      return true;
    } catch (err: any) {
      this.logger.error(err);
      return false;
    }
  }

  async sendNowOrLater(args: SendParams) {
    const MAX_TRIES = 3;
    for (let i = 0; i < MAX_TRIES; i++) {
      if (!this.rateLimiter || await this.rateLimiter.tryAddRequestIfWithinLimits(KEY)) {
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
    if (!this.rateLimiter || await this.rateLimiter.tryAddRequestIfWithinLimits(KEY)) {
      return this.trySendNow(args);
    }
    return false;
  }
}
