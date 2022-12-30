import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import RateLimiterModule from './rate-limiter/rate-limiter.module';
import CacherModule from './cacher/cacher.module';
import { getCommonImports } from './common-setup';
import AuthModule from './auth/auth.module';
import UsersModule from './users/users.module';
import DbconfigModule from './dbconfig/dbconfig.module';
import MailModule from './mail/mail.module';
import MeetingsModule from './meetings/meetings.module';
import CustomJwtModule from './custom-jwt/custom-jwt.module';
import OAuth2Module from './oauth2/oauth2.module';
import ServerInfoModule from './server-info/server-info.module';
import ConfigModule from './config/config.module';
import ConfigService from './config/config.service';

@Module({
  imports: [
    ...getCommonImports(),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory(configService: ConfigService) {
        return [{
          rootPath: configService.get('STATIC_ROOT'),
          exclude: ['/api/*', '/redirect/*'],
        }];
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    DbconfigModule,
    MeetingsModule,
    OAuth2Module,
    CustomJwtModule,
    MailModule,
    ServerInfoModule,
    CacherModule,
    RateLimiterModule,
  ],
})
export class AppModule {}
