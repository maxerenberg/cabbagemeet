import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate as validateEnv } from './env.validation';
import databaseOptionsFactory from './database-options-factory';

export default function getCommonImports() {
  const envFilePath = ({
    'development': '.development.env',
    'test': '.test.env',
    'production': '.env',
  } as const)[process.env.NODE_ENV];
  if (!envFilePath) {
    throw new Error('NODE_ENV must be set to development, test or production');
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
  ];
}
