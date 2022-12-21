import { Inject, Injectable } from '@nestjs/common';
import type { CustomRedisClientType } from './cacher.module';

interface ICacherStrategy {
  getAndPop(key: string): Promise<string | null>;
  add(key: string, value: string, ttlSeconds: number): Promise<void>;
  addIfNotPresent(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  shutdown(): void;
}

@Injectable()
export default class CacherService {
  private readonly strategy: ICacherStrategy;

  constructor(@Inject('REDIS_CLIENT') client: CustomRedisClientType | null) {
    if (client) {
      this.strategy = new RedisCacher(client);
    } else {
      this.strategy = new MemoryCacher();
    }
  }

  onApplicationShutdown() {
    this.strategy.shutdown();
  }

  getAndPop(key: string) {
    return this.strategy.getAndPop(key);
  }

  add(key: string, value: string, ttlSeconds: number) {
    return this.strategy.add(key, value, ttlSeconds);
  }

  addIfNotPresent(key: string, value: string, ttlSeconds: number) {
    return this.strategy.addIfNotPresent(key, value, ttlSeconds);
  }
}

class MemoryCacher implements ICacherStrategy {
  private readonly map = new Map<string, string>();
  private readonly timeouts = new Set<NodeJS.Timeout>();

  async getAndPop(key: string) {
    const value = this.map.get(key);
    if (value === undefined) {
      return null;
    }
    this.map.delete(key);
    return value;
  }

  async add(key: string, value: string, ttlSeconds: number) {
    this.map.set(key, value);
    const timeout = setTimeout(() => {
      this.map.delete(key);
      this.timeouts.delete(timeout);
    }, ttlSeconds * 1000);
    this.timeouts.add(timeout);
  }

  async addIfNotPresent(key: string, value: string, ttlSeconds: number) {
    if (this.map.has(key)) {
      return false;
    }
    this.add(key, value, ttlSeconds);
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

class RedisCacher implements ICacherStrategy {
  constructor(private readonly client: CustomRedisClientType) {}

  async getAndPop(key: string) {
    // TODO: use MULTI
    const value = await this.client.get(key);
    if (value) {
      await this.client.del(key);
    }
    return value;
  }

  async add(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, String(value), {
      EX: ttlSeconds,
    });
  }

  async addIfNotPresent(key: string, value: string, ttlSeconds: number) {
    const result = await this.client.set(key, String(value), {
      NX: true,
      EX: ttlSeconds,
    });
    return result === 'OK';
  }

  shutdown() {}
}
