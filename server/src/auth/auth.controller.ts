import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpCode,
  HttpException,
  HttpStatus,
  Query,
  ParseBoolPipe,
  UseGuards,
  Logger,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import {
  BadRequestResponse,
  UnauthorizedResponse,
  NotFoundResponse,
  CustomRedirectResponse,
} from '../common-responses';
import CustomJwtService from '../custom-jwt/custom-jwt.service';
import { EnvironmentVariables } from '../env.validation';
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
import RateLimiter, { SECONDS_PER_MINUTE } from '../rate-limiter';
import ResetPasswordDto from './reset-password.dto';
import JwtAuthGuard from './jwt-auth.guard';
import { AuthUser } from './auth-user.decorator';
import ConfirmResetPasswordDto from './ConfirmResetPassword.dto';
import VerifyEmailAddressResponse from './verify-email-address-response';
import { Request, Response } from 'express';
import VerifyEmailAddressDto from './verify-email-address.dto';

const setTokenDescription = (
  "A token will be set in the response body which must be included in the Authorization"
  + " header in future requests, like so: `Authorization: Bearer eyJhbGciOiJIUzI1NiI...`"
);
const RATE_LIMIT_ERROR_MESSAGE = 'Rate limit reached. Please try again later';

@ApiTags('auth')
@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly pwresetRateLimiter: RateLimiter;
  private readonly loginRateLimiter: RateLimiter;
  private readonly signupRateLimiter: RateLimiter;
  private readonly verifySignupEmailAddress: boolean;

  constructor(
    private authService: AuthService,
    private jwtService: CustomJwtService,
    private oauth2Service: OAuth2Service,
    private usersService: UsersService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    // A user can reset their password at most once every 10 minutes
    this.pwresetRateLimiter = new RateLimiter(SECONDS_PER_MINUTE * 10, 1);
    // A user can try to sign up at most once every 10 minutes
    this.signupRateLimiter = new RateLimiter(SECONDS_PER_MINUTE * 10, 1);
    // A user can try to login at most 10 times per minute
    this.loginRateLimiter = new RateLimiter(SECONDS_PER_MINUTE, 10);
    this.verifySignupEmailAddress = configService.get('VERIFY_SIGNUP_EMAIL_ADDRESS', {infer: true});
  }

  private async createTokenAndUpdateSavedTimestamp(user: User) {
    const {payload, token} = this.jwtService.serializeUserToJwt(user);
    await this.usersService.updateTimestamp(user, payload.iat);
    return {
      ...UserToUserResponse(user),
      token,
    };
  }

  private convertUserCreationError(err: any): Error {
    if (err instanceof UserAlreadyExistsError) {
      return new BadRequestException('user already exists');
    }
    return err;
  }

  @ApiOperation({
    summary: 'Sign up',
    description: (
      'Create a new account.<br><br>' + setTokenDescription + '<br><br>'
      + 'If email address verification is enabled, the user will be sent a code'
      + ' via email which they will need to enter at a later step.'
    ),
    operationId: 'signup',
  })
  @ApiCreatedResponse({type: UserResponseWithToken})
  @ApiOkResponse({type: VerifyEmailAddressResponse})
  @ApiBadRequestResponse({type: BadRequestResponse})
  @Post('signup')
  async signup(
    @Body() body: LocalSignupDto,
    @Req() req: Request,
    @Res({passthrough: true}) res: Response,
  ): Promise<UserResponseWithToken | VerifyEmailAddressResponse> {
    // TODO: rate limit based on IP address as well
    if (!this.signupRateLimiter.tryAddRequestIfWithinLimits(body.email)) {
      throw new HttpException(RATE_LIMIT_ERROR_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (this.verifySignupEmailAddress) {
      res.status(HttpStatus.OK);
      const existingUser = await this.usersService.findOneByEmail(body.email);
      if (existingUser !== null) {
        // Prevent user enumeration
        this.logger.debug(`Cannot signup user with email=${body.email}: already exists`);
        return {mustVerifyEmailAddress: true};
      }
      const verificationCodeWasSent = await this.authService.generateAndSendVerificationCode(body.name, body.email);
      if (!verificationCodeWasSent) {
        throw new ServiceUnavailableException('Please try again later');
      }
      return {mustVerifyEmailAddress: true};
    }
    res.status(HttpStatus.CREATED);
    let user: User;
    try {
      user = await this.authService.signup(body);
    } catch (err) {
      throw this.convertUserCreationError(err);
    }
    // TODO: avoid extra round-trip with database
    return this.createTokenAndUpdateSavedTimestamp(user);
  }

  @ApiOperation({
    summary: 'Verify email address',
    description: (
      'Verify the email address of a user who recently signed up by providing'
      + ' the code sent via email.'
    ),
    operationId: 'verifyEmail',
  })
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailAddressDto): Promise<UserResponseWithToken> {
    const {code, ...signupArgs} = body;
    let user: User | null = null;
    try {
      user = await this.authService.signupIfEmailIsVerified(signupArgs, code);
    } catch (err) {
      throw this.convertUserCreationError(err);
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    // TODO: avoid extra round-trip with database
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
    // TODO: rate limit based on IP address as well
    if (!this.loginRateLimiter.tryAddRequestIfWithinLimits(body.email)) {
      throw new HttpException(RATE_LIMIT_ERROR_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
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
  async resetPassword(@Body() {email}: ResetPasswordDto): Promise<void> {
    if (!this.pwresetRateLimiter.tryAddRequestIfWithinLimits(email)) {
      this.logger.debug(`User for email=${email} already reset password recently, ignoring`);
      return;
    }
    await this.authService.resetPassword(email);
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
        throw new NotFoundException('Google OAuth2 is not configured on this server');
      }
      throw err;
    }
  }

  @ApiOperation({
    summary: 'Login with Google',
    description: 'Returns a URL to an OAuth2 consent page where the client can sign in with their Google account',
    operationId: 'loginWithGoogle',
  })
  @ApiNotFoundResponse({type: NotFoundResponse})
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
