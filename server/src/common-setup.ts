import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate as validateEnv } from './env.validation';
import databaseOptionsFactory from './database-options-factory';
import CustomMigrationsModule from './custom-migrations/custom-migrations.module';
import { oauth2ProviderNames } from './oauth2/oauth2-common';

export function getCommonImports() {
  const envFilePath =
    process.env.DOTENV_PATH ||
    (
      {
        development: '.development.env',
        production: '.env',
      } as const
    )[process.env.NODE_ENV];
  if (!envFilePath) {
    throw new Error('NODE_ENV must be set to development or production, or DOTENV_PATH must be set');
  }

  return [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
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
}
