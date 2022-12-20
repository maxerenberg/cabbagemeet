import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import CustomJwtService from './custom-jwt.service';
import DbconfigModule from 'src/dbconfig/dbconfig.module';
import { DbconfigService } from '../dbconfig/dbconfig.service';
import { EnvironmentVariables } from '../env.validation';
import JwtStrategy, { getJWTSigningKey } from './jwt.strategy';
import UsersModule from 'src/users/users.module';
import CacherModule from 'src/cacher/cacher.module';

@Module({
  imports: [DbconfigModule],
  providers: [
    {
      provide: 'JWT_SIGNING_KEY',
      useFactory: (configService: ConfigService<EnvironmentVariables, true>, dbconfigService: DbconfigService): Promise<string> => {
        return getJWTSigningKey(configService, dbconfigService);
      },
      inject: [ConfigService, DbconfigService],
    }
  ],
  exports: ['JWT_SIGNING_KEY']
})
class CustomJwtDepsModule {}

@Module({
  imports: [
    CacherModule,
    UsersModule,
    CustomJwtDepsModule,
    JwtModule.registerAsync({
      imports: [CustomJwtDepsModule],
      useFactory: (secret: string) => {
        return {secret};
      },
      inject: ['JWT_SIGNING_KEY'],
    }),
  ],
  providers: [
    CustomJwtService,
    JwtStrategy,
  ],
  exports: [CustomJwtService],
})
export default class CustomJwtModule {}
