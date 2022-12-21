import { Global, Module } from '@nestjs/common';
import ConfigService from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export default class ConfigModule {}
