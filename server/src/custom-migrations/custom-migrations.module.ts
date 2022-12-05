import { Global, Module } from '@nestjs/common';
import CustomMigrationsService from './custom-migrations.service';

@Global()
@Module({
  providers: [CustomMigrationsService],
  exports: [CustomMigrationsService]
})
export default class CustomMigrationsModule {}
