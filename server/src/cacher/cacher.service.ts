import { Inject, Injectable } from '@nestjs/common';
import type { CustomRedisClientType } from './cacher.module';

interface ICacherStrategy {
  getAndPop(key: string): Promise<string | null>;
  add(key: string, value: string, ttlSeconds: number): Promise<void>;
  addIfNotPresent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
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
    setTimeout(() => {
      this.map.delete(key);
    }, ttlSeconds * 1000);
  }

  async addIfNotPresent(key: string, value: string, ttlSeconds: number) {
    if (this.map.has(key)) {
      return false;
    }
    this.add(key, value, ttlSeconds);
    return true;
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
}
