import { Inject, Injectable } from '@nestjs/common';
import type { CustomRedisClientType } from '../cacher/cacher.module';

export interface IRateLimiter {
  tryAddRequestIfWithinLimits(key: string): Promise<boolean>;
  shutdown(): void;
}

@Injectable()
export default class RateLimiterService {
  private readonly rateLimiters: IRateLimiter[] = [];

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: CustomRedisClientType | null,
  ) {}

  onApplicationShutdown() {
    for (const rateLimiter of this.rateLimiters) {
      rateLimiter.shutdown();
    }
  }

  factory(intervalSeconds: number, limit: number): IRateLimiter {
    let rateLimiter: IRateLimiter | undefined;
    if (this.redisClient) {
      rateLimiter = new RedisRateLimiter(
        this.redisClient,
        intervalSeconds,
        limit,
      );
    } else {
      rateLimiter = new MemoryRateLimiter(intervalSeconds, limit);
    }
    this.rateLimiters.push(rateLimiter);
    return rateLimiter;
  }
}

class MemoryRateLimiter implements IRateLimiter {
  private readonly intervalMs: number;
  private readonly counters: Record<string, number> = {};
  private readonly timeouts = new Set<NodeJS.Timeout>();

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
    const timeout = setTimeout(() => {
      if (--this.counters[key] === 0) {
        delete this.counters[key];
        this.timeouts.delete(timeout);
      }
    }, this.intervalMs);
    this.timeouts.add(timeout);
    return true;
  }

  shutdown() {
    // Need to clear timeouts or else tests will hang
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
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
    return this.client.tryAddRequestIfWithinLimits(
      key,
      this.intervalSeconds,
      this.limit,
    );
  }

  shutdown() {}
}
