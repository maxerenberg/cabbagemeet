import { Module } from '@nestjs/common';
import RateLimiterModule from '../rate-limiter/rate-limiter.module';
import MailService from './mail.service';

@Module({
  imports: [RateLimiterModule],
  providers: [MailService],
  exports: [MailService],
})
export default class MailModule {}
