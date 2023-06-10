import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import type { EnvironmentVariables } from './env.validation';
import { validate as validateEnv } from './env.validation';

class ConfigOptionNotSetError extends Error {}

@Injectable()
export default class ConfigService {
  private readonly cache: EnvironmentVariables;

  constructor() {
    if (process.env.DOTENV_PATH) {
      dotenv.config({ path: process.env.DOTENV_PATH });
    } else {
      const envFilePath =
        process.env.NODE_ENV === 'development' ? '.development.env' : '.env';
      if (fs.existsSync(envFilePath)) {
        dotenv.config({ path: envFilePath });
      }
    }
    this.cache = validateEnv(process.env);
  }

  get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.cache[key];
  }

  getOrThrow<K extends keyof EnvironmentVariables>(
    key: K,
  ): EnvironmentVariables[K] {
    const val = this.cache[key];
    if (val === undefined) {
      throw new ConfigOptionNotSetError(key + ' was not set');
    }
    return val;
  }
}
