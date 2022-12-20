import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import AuthService from './auth.service';
import UsersModule from '../users/users.module';
import JwtAuthGuard from './jwt-auth.guard';
import OptionalJwtAuthGuard from './optional-jwt-auth.guard';
import CustomJwtModule from '../custom-jwt/custom-jwt.module';
import OAuth2Module from '../oauth2/oauth2.module';
import MailModule from '../mail/mail.module';
import RateLimiterModule from 'src/rate-limiter/rate-limiter.module';


@Global()
@Module({
  imports: [
    RateLimiterModule,
    OAuth2Module,
    CustomJwtModule,
    UsersModule,
    PassportModule,
    MailModule,
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export default class AuthModule {}
