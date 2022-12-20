import { Module } from '@nestjs/common';
import { RedisClientModule } from 'src/cacher/cacher.module';
import RateLimiterService from './rate-limiter.service';

@Module({
  imports: [RedisClientModule],
  providers: [RateLimiterService],
  exports: [RateLimiterService],
})
export default class RateLimiterModule {}
