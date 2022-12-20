import { Inject, Injectable } from '@nestjs/common';
import type { CustomRedisClientType } from '../cacher/cacher.module';

export interface IRateLimiter {
  tryAddRequestIfWithinLimits(key: string): Promise<boolean>;
}

@Injectable()
export default class RateLimiterService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: CustomRedisClientType | null) {}

  factory(intervalSeconds: number, limit: number): IRateLimiter {
    if (this.redisClient) {
      return new RedisRateLimiter(this.redisClient, intervalSeconds, limit);
    }
    return new MemoryRateLimiter(intervalSeconds, limit);
  }
}

class MemoryRateLimiter implements IRateLimiter {
  private readonly intervalMs: number;
  private counters: Record<string, number> = {};

  constructor(
    intervalSeconds: number,
    // max. number of requests within a given interval
    private readonly limit: number,
  ) {
    this.intervalMs = intervalSeconds * 1000;
  }

  async tryAddRequestIfWithinLimits(key: string) {
    if (this.counters.hasOwnProperty(key) && this.counters[key] >= this.limit) {
      return false;
    }
    if (this.counters.hasOwnProperty(key)) {
      this.counters[key]++;
    } else {
      this.counters[key] = 1;
    }
    setTimeout(() => {
      if (--this.counters[key] === 0) {
        delete this.counters[key];
      }
    }, this.intervalMs);
    return true;
  }
}

class RedisRateLimiter implements IRateLimiter {
  constructor(
    private readonly client: CustomRedisClientType,
    private readonly intervalSeconds: number,
    // max. number of requests within a given interval
    private readonly limit: number,
  ) {}

  tryAddRequestIfWithinLimits(key: string) {
    return this.client.tryAddRequestIfWithinLimits(key, this.intervalSeconds, this.limit);
  }
}
