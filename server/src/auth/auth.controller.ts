import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Query,
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiBadRequestResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
import UsersService, { UserAlreadyExistsError } from '../users/users.service';
import AuthService from './auth.service';
import LocalLoginDto from './local-login.dto';
import LocalSignupDto from './local-signup.dto';
import OAuth2Service, {
  OAuth2Provider,
  OAuth2Reason,
  OAuth2NotConfiguredError,
} from '../oauth2/oauth2.service';
import OAuth2ConsentPostRedirectDto from '../oauth2/oauth2-consent-post-redirect.dto';
import ResetPasswordDto from './reset-password.dto';
import JwtAuthGuard from './jwt-auth.guard';
import { AuthUser } from './auth-user.decorator';
import ConfirmResetPasswordDto from './ConfirmResetPassword.dto';

const setTokenDescription = (
  "A token will be set in the response body which must be included in the Authorization"
  + " header in future requests, like so: `Authorization: Bearer eyJhbGciOiJIUzI1NiI...`"
);

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: CustomJwtService,
    private oauth2Service: OAuth2Service,
    private usersService: UsersService,
  ) {}

  private async createTokenAndUpdateSavedTimestamp(user: User) {
    const {payload, token} = this.jwtService.serializeUserToJwt(user);
    await this.usersService.updateTimestamp(user, payload.iat);
    return {
      ...UserToUserResponse(user),
      token,
    };
  }

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
    return this.createTokenAndUpdateSavedTimestamp(user);
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
    return this.createTokenAndUpdateSavedTimestamp(user);
  }

  @ApiOperation({
    summary: 'Log out',
    description: 'Destroy the session of the user who is currently logged in.',
    operationId: 'logout',
  })
  @ApiQuery({
    name: 'everywhere',
    description: 'If true, the user will be logged out everywhere',
    required: false,
    type: Boolean,
  })
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async signout(
    @Query('everywhere', ParseBoolPipe) logoutEverywhere: boolean,
    @AuthUser() user: User,
  ): Promise<void> {
    if (logoutEverywhere) {
      await this.usersService.invalidateTimestamp(user.ID);
    }
  }

  @ApiOperation({
    summary: 'Reset password',
    description: (
      'Reset the password of the user with the given email. A confirmation link ' +
      'will be sent to the given address.'
    ),
    operationId: 'resetPassword',
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(body.email);
  }

  @ApiOperation({
    summary: 'Confirm password reset',
    description: (
      'Confirm a new password for the given user. The token in the Authorization ' +
      'header is expected to be the same as that sent in the confirmation email.'
    ),
    operationId: 'confirmPasswordReset',
  })
  @ApiBearerAuth()
  @Post('confirm-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async confirmResetPassword(
    @AuthUser() user: User,
    @Body() body: ConfirmResetPasswordDto,
  ) {
    await this.authService.confirmResetPassword(user, body.password);
  }

  private redirectToGoogle(reason: OAuth2Reason, postRedirect: string, nonce?: string): string {
    try {
      return this.oauth2Service.getRequestURL(OAuth2Provider.GOOGLE, {reason, postRedirect, nonce});
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
  loginWithGoogle(@Body() body: OAuth2ConsentPostRedirectDto): CustomRedirectResponse {
    return {
      redirect: this.redirectToGoogle('login', body.post_redirect, body.nonce)
    };
  }

  @ApiOperation({
    summary: 'Sign up with Google',
    description: 'Returns a URL to an OAuth2 consent page where the client can sign up with their Google account',
    operationId: 'signupWithGoogle',
  })
  @Post('signup-with-google')
  @HttpCode(HttpStatus.OK)
  signupWithGoogle(@Body() body: OAuth2ConsentPostRedirectDto): CustomRedirectResponse {
    return {
      redirect: this.redirectToGoogle('signup', body.post_redirect, body.nonce)
    };
  }
}
