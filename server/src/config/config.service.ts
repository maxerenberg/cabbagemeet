import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import type { EnvironmentVariables } from './env.validation';
import { validate as validateEnv } from './env.validation';

class ConfigOptionNotSetError extends Error {}

@Injectable()
export default class ConfigService {
  private readonly cache: EnvironmentVariables;

  constructor() {
    const envFilePath =
      process.env.DOTENV_PATH || ({
        development: '.development.env',
        production: '.env',
      } as const)[process.env.NODE_ENV];
    if (!envFilePath) {
      throw new Error('NODE_ENV must be set to development or production, or DOTENV_PATH must be set');
    }
    dotenv.config({path: envFilePath});
    this.cache = validateEnv(process.env);
  }

  get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.cache[key];
  }

  getOrThrow<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    const val = this.cache[key];
    if (val === undefined) {
      throw new ConfigOptionNotSetError(key + ' was not set');
    }
    return val;
  }
}
