import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthUser } from 'src/auth/auth-user.decorator';
import JwtAuthGuard from 'src/auth/jwt-auth.guard';
import CustomJwtService from 'src/custom-jwt/custom-jwt.service';
import { assertIsNever, encodeQueryParams } from 'src/misc.utils';
import UserResponse from 'src/users/user-response';
import User from 'src/users/user.entity';
import { UserToUserResponse } from 'src/users/users.controller';
import UsersService from 'src/users/users.service';
import ConfirmLinkAccountDto from './confirm-link-account.dto';
import type GoogleOAuth2 from './google-oauth2.entity';
import OAuth2Service, {
  oauth2Reasons,
  OAuth2State,
  OAuth2NotConfiguredError,
  OAuth2Provider,
  OAuth2AccountAlreadyLinkedError,
  OAuth2NotAllScopesGrantedError,
} from './oauth2.service';

@ApiTags('externalCalendars')
@Controller()
export class Oauth2Controller {
  private readonly logger = new Logger(Oauth2Controller.name);

  constructor(
    private readonly oauth2Service: OAuth2Service,
    private readonly jwtService: CustomJwtService,
    private readonly usersService: UsersService,
  ) {}

  private stateIsValid(state: any): boolean {
    return typeof state === 'object'
        && typeof state.reason === 'string'
        && oauth2Reasons.some(reason => state.reason === reason)
        && (state.reason !== 'link' || typeof state.userID === 'number')
        && typeof state.postRedirect === 'string';
  }

  private async redirectWithToken(res: Response, redirectURL: string, nonce: string | undefined, user: User) {
    // We need to "push" the response to the client
    const {payload, token} = this.jwtService.serializeUserToJwt(user);
    await this.usersService.updateTimestamp(user, payload.iat);
    const urlParams: Record<string, string> = {token};
    if (nonce) {
      urlParams.nonce = nonce;
    }
    const encodedURLParams = encodeQueryParams(urlParams);
    if (redirectURL.includes('?')) {
      res.redirect(redirectURL + '&' + encodedURLParams);
    } else {
      res.redirect(redirectURL + '?' + encodedURLParams);
    }
  }

  @ApiExcludeEndpoint()
  @Get('redirect/google')
  async googleRedirect(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') stateStr?: string,
    @Query('error') error?: string,
  ) {
    if (error) {
      throw new Error(error);
    }
    const state = JSON.parse(stateStr!) as OAuth2State;
    if (!this.stateIsValid(state)) {
      res.status(400).contentType('text/plain').send('invalid state');
      return;
    }
    try {
      if (state.reason === 'link') {
        await this.oauth2Service.google_fetchAndStoreUserInfoForLinking(code, state);
        res.redirect(state.postRedirect);
      } else if (state.reason === 'signup') {
        const user = await this.oauth2Service.google_fetchAndStoreUserInfoForSignup(code, state);
        await this.redirectWithToken(res, state.postRedirect, state.nonce, user);
      } else if (state.reason === 'login') {
        const {
          user,
          isLinkedToAccountFromOIDCResponse,
          pendingOAuth2Entity,
        } = await this.oauth2Service.google_handleLogin(code, state);
        if (isLinkedToAccountFromOIDCResponse) {
          // The user already explicitly linked their account with Google (either by
          // signing up with Google initially, or by clicking 'Link account' from the
          // settings page). We should successfully log them in.
          await this.redirectWithToken(res, state.postRedirect, state.nonce, user);
        } else if (user) {
          // The user signed up with this Gmail account, but never linked the account
          // via the settings page. We need them to confirm whether they want
          // to link the accounts together.
          if (!pendingOAuth2Entity.RefreshToken) {
            this.logger.debug('User exists, but OIDC response has no refresh token. Redirecting to consent page.');
            res.redirect(this.oauth2Service.getRequestURL(
              OAuth2Provider.GOOGLE, {...state, reason: state.reason}, true)
            );
            return;
          }
          const {token} = this.jwtService.serializeUserToJwt(user);
          // To avoid showing OAuth2 tokens in the browser URL bar, we encrypt the
          // entity first
          const {
            encrypted: encryptedEntity,
            iv,
            salt,
            tag,
          } = await this.jwtService.encryptText(JSON.stringify(pendingOAuth2Entity!));
          const urlParams: Record<string, string> = {
            postRedirect: state.postRedirect,
            token,
            encryptedEntity: encryptedEntity.toString('base64url'),
            iv: iv.toString('base64url'),
            salt: salt.toString('base64url'),
            tag: tag.toString('base64url'),
          };
          if (state.nonce) {
            urlParams.nonce = state.nonce;
          }
          res.redirect('/confirm-link-google-account?' + encodeQueryParams(urlParams));
        } else {
          // The local account associated with this Google account no longer exists.
          // We need to force the user to go through the consent screen again
          // so that we can get a new refresh token.
          this.logger.debug('User does not exist. Redirecting to consent page.');
          res.redirect(this.oauth2Service.getRequestURL(
            OAuth2Provider.GOOGLE, {...state, reason: state.reason}, true)
          );
        }
      } else {
        assertIsNever(state.reason);
      }
    } catch (err: any) {
      if (err instanceof OAuth2NotConfiguredError) {
        res.redirect('/error?e=E_GOOGLE_OAUTH2_NOT_AVAILABLE');
      } else if (err instanceof OAuth2AccountAlreadyLinkedError) {
        res.redirect('/error?e=E_GOOGLE_ACCOUNT_ALREADY_LINKED');
      } else if (err instanceof OAuth2NotAllScopesGrantedError) {
        res.redirect('/error?e=E_NOT_ALL_OAUTH2_SCOPES_GRANTED');
      } else {
        this.logger.error(err);
        res.redirect('/error?e=E_INTERNAL_SERVER_ERROR');
      }
    }
  }

  @ApiOperation({
    summary: 'Confirm Google account linking',
    description: (
      'Confirm that the Google account in the encryptedEntity should be linked to the'
      + ' account of the user who is currently logged in. This should be called after'
      + ' the user is redirected to the /confirm-link-google-account page.'
    ),
    operationId: 'confirmLinkGoogleAccount',
  })
  @ApiBearerAuth()
  @Post('confirm-link-google-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async confirmLinkGoogleAccount(
    @AuthUser() user: User,
    @Body() body: ConfirmLinkAccountDto,
  ): Promise<UserResponse> {
    const encryptedEntity = Buffer.from(body.encrypted_entity, 'base64url');
    const iv = Buffer.from(body.iv, 'base64url');
    const salt = Buffer.from(body.salt, 'base64url');
    const tag = Buffer.from(body.tag, 'base64url');
    const oauth2Entity = JSON.parse(
      await this.jwtService.decryptText(encryptedEntity, iv, salt, tag)
    ) as Partial<GoogleOAuth2>;
    // sanity check
    if (!(
      typeof oauth2Entity === 'object'
      && typeof oauth2Entity.UserID === 'number'
      && oauth2Entity.UserID === user.ID
    )) {
      throw new BadRequestException('Invalid encrypted entity');
    }
    try {
      await this.oauth2Service.google_linkAccountFromConfirmation(oauth2Entity);
    } catch (err: any) {
      if (err instanceof OAuth2AccountAlreadyLinkedError) {
        throw new ConflictException('This Google account is already linked');
      }
      throw err;
    }
    // Return the modified user
    user.GoogleOAuth2 = {LinkedCalendar: true} as GoogleOAuth2;
    return UserToUserResponse(user);
  }
}
