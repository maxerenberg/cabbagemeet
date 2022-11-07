import { MiddlewareConsumer, Module } from '@nestjs/common';
import * as morgan from 'morgan';
import getCommonImports from './common-imports';
import { AuthModule } from './auth/auth.module';
import UsersModule from './users/users.module';
import { DbconfigModule } from './dbconfig/dbconfig.module';
import MeetingsModule from './meetings/meetings.module';
import CustomJwtModule from './custom-jwt/custom-jwt.module';
import OAuth2Module from './oauth2/oauth2.module';

@Module({
  imports: [
    ...getCommonImports(),
    AuthModule,
    UsersModule,
    DbconfigModule,
    MeetingsModule,
    OAuth2Module,
    CustomJwtModule,
  ],
})
export class AppModule {
  async configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(morgan('combined'))
      .forRoutes('*');
  }
}
