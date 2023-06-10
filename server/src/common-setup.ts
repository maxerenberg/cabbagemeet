import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import ConfigModule from './config/config.module';
import ConfigService from './config/config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseOptionsFactory from './database-options-factory';
import CustomMigrationsModule from './custom-migrations/custom-migrations.module';
import EnoentFilter from './enoent.filter';
import { oauth2ProviderNames } from './oauth2/oauth2-common';
import { HttpAdapterHost } from '@nestjs/core';

// Also used by the database migrations
export function getCommonImports() {
  return [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseOptionsFactory,
      inject: [ConfigService],
    }),
    CustomMigrationsModule,
  ];
}

// Also used by the E2E tests
export function commonAppBootstrap(app: INestApplication) {
  app.setGlobalPrefix('api', {
    exclude: oauth2ProviderNames.map(
      (name) => `redirect/${name.toLowerCase()}`,
    ),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true, // this doesn't seem to have any effect...
      whitelist: true,
      forbidNonWhitelisted: true,
      // This ensures that the 'message' property of the error response
      // is a string, not an array
      exceptionFactory: (errors) =>
        new BadRequestException(Object.values(errors[0].constraints)[0]),
    }),
  );
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new EnoentFilter(httpAdapter));
}
