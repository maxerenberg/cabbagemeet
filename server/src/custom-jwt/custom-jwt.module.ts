import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import ConfigService from '../config/config.service';
import DbconfigModule from '../dbconfig/dbconfig.module';
import { DbconfigService } from '../dbconfig/dbconfig.service';
import CustomJwtService from './custom-jwt.service';
import JwtStrategy, { getJWTSigningKey } from './jwt.strategy';
import UsersModule from '../users/users.module';
import CacherModule from '../cacher/cacher.module';

@Module({
  imports: [DbconfigModule],
  providers: [
    {
      provide: 'JWT_SIGNING_KEY',
      useFactory: (
        configService: ConfigService,
        dbconfigService: DbconfigService,
      ): Promise<string> => {
        return getJWTSigningKey(configService, dbconfigService);
      },
      inject: [ConfigService, DbconfigService],
    },
  ],
  exports: ['JWT_SIGNING_KEY'],
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
        return { secret };
      },
      inject: ['JWT_SIGNING_KEY'],
    }),
  ],
  providers: [CustomJwtService, JwtStrategy],
  exports: [CustomJwtService],
})
export default class CustomJwtModule {}
