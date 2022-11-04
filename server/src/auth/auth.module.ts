import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import AuthService from './auth.service';
import UsersModule from '../users/users.module';
import JwtAuthGuard from './jwt-auth.guard';
import OptionalJwtAuthGuard from './optional-jwt-auth.guard';
import CustomJwtModule from 'src/custom-jwt/custom-jwt.module';
import OAuth2Module from 'src/oauth2/oauth2.module';


@Global()
@Module({
  imports: [
    OAuth2Module,
    CustomJwtModule,
    UsersModule,
    PassportModule,
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
