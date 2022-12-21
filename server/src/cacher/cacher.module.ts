import { Module } from '@nestjs/common';
import { createClient } from 'redis';
import ConfigService from '../config/config.service';
import { luaScriptConfig as rateLimiterLuaScript } from '../rate-limiter/redis-rate-limiter-lua-script';
import CacherService from './cacher.service';

function redisClientFactory(configService: ConfigService) {
  const host = configService.get('REDIS_HOST');
  const port = configService.get('REDIS_PORT');
  const database = configService.get('REDIS_DATABASE');
  if (!host || !port) {
    return null;
  }
  return createClient({
    url: `redis://${host}:${port}`,
    database,
    scripts: {
      ...rateLimiterLuaScript,
    },
  });
}
export type CustomRedisClientType = Exclude<
  ReturnType<typeof redisClientFactory>,
  null
>;

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (
        configService: ConfigService,
      ): Promise<CustomRedisClientType | null> => {
        const client = redisClientFactory(configService);
        if (client) {
          await client.connect();
        }
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisClientModule {}

@Module({
  imports: [RedisClientModule],
  providers: [CacherService],
  exports: [CacherService],
})
export default class CacherModule {}
