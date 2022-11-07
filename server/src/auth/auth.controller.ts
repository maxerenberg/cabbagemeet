import {
  Controller,
  Post,
  Req,
  Body,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiResponse, ApiBadRequestResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import {
  BadRequestResponse,
  UnauthorizedResponse,
  NotFoundResponse,
  CustomRedirectResponse,
} from '../common-responses';
import CustomJwtService from '../custom-jwt/custom-jwt.service';
import { UserResponseWithToken } from '../users/user-response';
import User from '../users/user.entity';
import { UserToUserResponse } from '../users/users.controller';
import { UserAlreadyExistsError } from '../users/users.service';
import AuthService from './auth.service';
import LocalLoginDto from './local-login.dto';
import LocalSignupDto from './local-signup.dto';
import OAuth2Service, {OAuth2Provider, OAuth2Reason, OAuth2NotConfiguredError} from 'src/oauth2/oauth2.service';

const setTokenDescription = (
  "A token will be set in the response body which must be included in the Authorization"
  + " header in future requests, like so: `Authorization: Bearer eyJhbGciOiJIUzI1NiI...`"
);

export function UserToUserResponseWithToken(user: User, jwtService: CustomJwtService): UserResponseWithToken {
  return {
    ...UserToUserResponse(user),
    token: jwtService.serializeUserToJwt(user),
  };
}

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: CustomJwtService,
    private oauth2Service: OAuth2Service,
  ) {}

  // TODO: email verification
  @ApiOperation({
    summary: 'Sign up',
    description: 'Create a new account.<br><br>' + setTokenDescription,
    operationId: 'signup',
  })
  @ApiBadRequestResponse({type: BadRequestResponse})
  @Post('signup')
  async signup(@Body() body: LocalSignupDto): Promise<UserResponseWithToken> {
    let user: User;
    try {
      user = await this.authService.signup(body);
    } catch (err: any) {
      if (err instanceof UserAlreadyExistsError) {
        throw new BadRequestException('user already exists');
      }
      throw err;
    }
    return UserToUserResponseWithToken(user, this.jwtService);
  }

  @ApiOperation({
    summary: 'Login',
    description: "Login using existing credentials.<br><br>" + setTokenDescription,
    operationId: 'login',
  })
  @ApiUnauthorizedResponse({type: UnauthorizedResponse})
  @ApiBadRequestResponse({type: BadRequestResponse})
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LocalLoginDto): Promise<UserResponseWithToken> {
    const user = await this.authService.validateUser(body.email, body.password);
    if (user === null) {
      throw new UnauthorizedException();
    }
    return UserToUserResponseWithToken(user, this.jwtService);
  }

  @ApiOperation({
    summary: 'Log out',
    description: 'Destroy the session of the user who is currently logged in.',
    operationId: 'logout',
  })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signout(@Req() req: Request): Promise<void> {
    // TODO: add option to signout of all sessions everywhere (use iat claim in JWT)
  }

  private redirectToGoogle(reason: OAuth2Reason): string {
    try {
      return this.oauth2Service.getRequestURL(OAuth2Provider.GOOGLE, {reason, postRedirect: '/'});
    } catch (err: any) {
      if (err instanceof OAuth2NotConfiguredError) {
        throw new NotFoundException();
      }
      throw err;
    }
  }

  @ApiOperation({
    summary: 'Login with Google',
    description: 'Returns a URL to an OAuth2 consent page where the client can sign in with their Google account',
    operationId: 'loginWithGoogle',
  })
  @ApiResponse({type: NotFoundResponse})
  @Post('login-with-google')
  @HttpCode(HttpStatus.OK)
  loginWithGoogle(): CustomRedirectResponse {
    return {
      redirect: this.redirectToGoogle('login')
    };
  }

  @ApiOperation({
    summary: 'Sign up with Google',
    description: 'Returns a URL to an OAuth2 consent page where the client can sign up with their Google account',
    operationId: 'signupWithGoogle',
  })
  @Post('signup-with-google')
  @HttpCode(HttpStatus.OK)
  signupWithGoogle(): CustomRedirectResponse {
    return {
      redirect: this.redirectToGoogle('signup')
    };
  }
}
