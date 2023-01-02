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
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthUser } from '../auth/auth-user.decorator';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import ConfigService from '../config/config.service';
import CustomJwtService from '../custom-jwt/custom-jwt.service';
import { assertIsNever, capitalize, encodeQueryParams } from '../misc.utils';
import UserResponse from '../users/user-response';
import User from '../users/user.entity';
import { UserToUserResponse } from '../users/users.controller';
import UsersService from '../users/users.service';
import AbstractOAuth2 from './abstract-oauth2.entity';
import ConfirmLinkAccountDto from './confirm-link-account.dto';
import OAuth2Service, {
  OIDCLoginResultType,
  OAuth2State,
} from './oauth2.service';
import {
  oauth2ProviderNamesMap,
  OAuth2ProviderType,
  oauth2Reasons,
  OAuth2NotConfiguredError,
  OAuth2AccountAlreadyLinkedError,
  OAuth2NotAllScopesGrantedError,
  OAuth2NoRefreshTokenError,
} from './oauth2-common';

@ApiTags('externalCalendars')
@Controller()
export class Oauth2Controller {
  private readonly logger = new Logger(Oauth2Controller.name);
  private readonly publicURL: string;

  constructor(
    configService: ConfigService,
    private readonly oauth2Service: OAuth2Service,
    private readonly jwtService: CustomJwtService,
    private readonly usersService: UsersService,
  ) {
    this.publicURL = configService.get('PUBLIC_URL');
  }

  private stateIsValid(state: any): state is OAuth2State {
    return (
      typeof state === 'object' &&
      typeof state.reason === 'string' &&
      oauth2Reasons.some((reason) => state.reason === reason) &&
      (state.reason !== 'link' || typeof state.userID === 'number') &&
      typeof state.postRedirect === 'string'
    );
  }

  private createAbsoluteUrlForRedirect(url: string): string {
    // The API server might have a different origin than the public URL
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return url;
    }
    return this.publicURL + (url.startsWith('/') ? '' : '/') + url;
  }

  private async redirectWithToken(
    res: Response,
    redirectURL: string,
    nonce: string | undefined,
    user: User,
  ) {
    // We need to "push" the response to the client
    const { payload, token } = this.jwtService.serializeUserToJwt(user);
    await this.usersService.updateTimestamp(user, payload.iat);
    const urlParams: Record<string, string> = { token };
    if (nonce) {
      urlParams.nonce = nonce;
    }
    redirectURL = this.createAbsoluteUrlForRedirect(redirectURL);
    const encodedURLParams = encodeQueryParams(urlParams);
    if (redirectURL.includes('?')) {
      res.redirect(redirectURL + '&' + encodedURLParams);
    } else {
      res.redirect(redirectURL + '?' + encodedURLParams);
    }
  }

  private async handleRedirectForLogin(
    providerType: OAuth2ProviderType,
    providerName: string,
    res: Response,
    code: string,
    state: OAuth2State,
  ) {
    const loginResult = await this.oauth2Service.handleLogin(
      providerType,
      code,
      state,
    );
    if (
      loginResult.type === OIDCLoginResultType.USER_EXISTS_AND_IS_LINKED
    ) {
      await this.redirectWithToken(
        res,
        state.postRedirect,
        state.clientNonce,
        loginResult.user,
      );
    } else if (
      loginResult.type ===
      OIDCLoginResultType.USER_EXISTS_BUT_IS_NOT_LINKED_AND_NEED_A_NEW_REFRESH_TOKEN
    ) {
      this.logger.debug(
        'User exists, but OIDC response has no refresh token. Redirecting to consent page.',
      );
      res.redirect(
        await this.oauth2Service.getRequestURL(providerType, state, true),
      );
    } else if (
      loginResult.type === OIDCLoginResultType.USER_EXISTS_BUT_IS_NOT_LINKED
    ) {
      // The user signed up with this Gmail account, but never linked the account
      // via the settings page. We need them to confirm whether they want
      // to link the accounts together.
      const { token } = this.jwtService.serializeUserToJwt(
        loginResult.user,
      );
      // To avoid showing OAuth2 tokens in the browser URL bar, we encrypt the
      // entity first
      const {
        encrypted: encryptedEntity,
        iv,
        salt,
        tag,
      } = await this.jwtService.encryptText(
        JSON.stringify(loginResult.pendingOAuth2Entity),
      );
      const urlParams: Record<string, string> = {
        postRedirect: state.postRedirect,
        token,
        encryptedEntity: encryptedEntity.toString('base64url'),
        iv: iv.toString('base64url'),
        salt: salt.toString('base64url'),
        tag: tag.toString('base64url'),
      };
      if (state.clientNonce) {
        urlParams.nonce = state.clientNonce;
      }
      res.redirect(
        `${this.publicURL}/confirm-link-${providerName}-account?` +
        encodeQueryParams(urlParams),
      );
    } else if (
      loginResult.type ===
      OIDCLoginResultType.USER_DOES_NOT_EXIST_AND_NEED_A_NEW_REFRESH_TOKEN
    ) {
      this.logger.debug(
        'User does not exist. Redirecting to consent page.',
      );
      res.redirect(
        await this.oauth2Service.getRequestURL(providerType, state, true)
      );
    } else {
      assertIsNever(loginResult.type);
    }
  }

  private async handleRedirectFromOAuth2Provider(
    providerType: OAuth2ProviderType,
    res: Response,
    code?: string,
    stateStr?: string,
    error?: string,
  ) {
    const providerName = oauth2ProviderNamesMap[providerType].toLowerCase();
    // WARN: We MUST explicitly send a response back to the client (e.g. res.redirect)
    // or else the request will hang forever
    if (error) {
      this.logger.log('Received error from OIDC server:');
      this.logger.log(error);
      res.redirect(`${this.publicURL}/error?e=E_INTERNAL_SERVER_ERROR`);
      return;
    }
    if (!code) {
      res.status(400).send({error: 'Bad Request', message: 'Missing code'});
      return;
    }
    if (!stateStr) {
      res.status(400).send({error: 'Bad Request', message: 'Missing state'});
      return;
    }
    try {
      const state = JSON.parse(stateStr);
      if (!this.stateIsValid(state)) {
        res.status(400).send({error: 'Bad Request', message: 'Invalid state'});
        return;
      }
      if (state.reason === 'link') {
        try {
          await this.oauth2Service.fetchAndStoreUserInfoForLinking(
            providerType,
            code,
            state,
          );
        } catch (err) {
          if (err instanceof OAuth2NoRefreshTokenError) {
            this.logger.debug('OIDC response has no refresh token. Redirecting to consent page.');
            res.redirect(
              await this.oauth2Service.getRequestURL(providerType, state, true)
            );
            return;
          }
          throw err;
        }
        res.redirect(this.createAbsoluteUrlForRedirect(state.postRedirect));
      } else if (state.reason === 'signup') {
        const user = await this.oauth2Service.fetchAndStoreUserInfoForSignup(
          providerType,
          code,
          state,
        );
        await this.redirectWithToken(
          res,
          state.postRedirect,
          state.clientNonce,
          user,
        );
      } else if (state.reason === 'login') {
        await this.handleRedirectForLogin(providerType, providerName, res, code, state);
      } else {
        assertIsNever(state.reason);
      }
    } catch (err: any) {
      const providerParam = providerName.toUpperCase();
      if (err instanceof OAuth2NotConfiguredError) {
        res.redirect(
          `${this.publicURL}/error?e=E_OAUTH2_NOT_AVAILABLE&provider=${providerParam}`,
        );
      } else if (err instanceof OAuth2AccountAlreadyLinkedError) {
        res.redirect(
          `${this.publicURL}/error?e=E_OAUTH2_ACCOUNT_ALREADY_LINKED&provider=${providerParam}`,
        );
      } else if (err instanceof OAuth2NotAllScopesGrantedError) {
        res.redirect(
          `${this.publicURL}/error?e=E_OAUTH2_NOT_ALL_SCOPES_GRANTED&provider=${providerParam}`,
        );
      } else {
        this.logger.error(err);
        res.redirect(`${this.publicURL}/error?e=E_INTERNAL_SERVER_ERROR`);
      }
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
    await this.handleRedirectFromOAuth2Provider(
      OAuth2ProviderType.GOOGLE,
      res,
      code,
      stateStr,
      error,
    );
  }

  @ApiExcludeEndpoint()
  @Get('redirect/microsoft')
  async microsoftRedirect(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') stateStr?: string,
    @Query('error') error?: string,
  ) {
    await this.handleRedirectFromOAuth2Provider(
      OAuth2ProviderType.MICROSOFT,
      res,
      code,
      stateStr,
      error,
    );
  }

  private async confirmLinkOAuth2Account(
    providerType: OAuth2ProviderType,
    user: User,
    body: ConfirmLinkAccountDto,
  ): Promise<UserResponse> {
    const encryptedEntity = Buffer.from(body.encrypted_entity, 'base64url');
    const iv = Buffer.from(body.iv, 'base64url');
    const salt = Buffer.from(body.salt, 'base64url');
    const tag = Buffer.from(body.tag, 'base64url');
    const oauth2Entity = JSON.parse(
      await this.jwtService.decryptText(encryptedEntity, iv, salt, tag),
    ) as Partial<AbstractOAuth2>;
    // sanity check
    if (
      !(
        typeof oauth2Entity === 'object' &&
        typeof oauth2Entity.UserID === 'number' &&
        oauth2Entity.UserID === user.ID
      )
    ) {
      throw new BadRequestException('Invalid encrypted entity');
    }
    try {
      // This modifies the user object
      await this.oauth2Service.linkAccountFromConfirmation(
        providerType,
        user,
        oauth2Entity,
      );
    } catch (err: any) {
      if (err instanceof OAuth2AccountAlreadyLinkedError) {
        const providerName = capitalize(oauth2ProviderNamesMap[providerType]);
        throw new ConflictException(
          `This ${providerName} account is already linked`,
        );
      }
      throw err;
    }
    return UserToUserResponse(user);
  }

  @ApiOperation({
    summary: 'Confirm Google account linking',
    description:
      'Confirm that the Google account in the encryptedEntity should be linked to the' +
      ' account of the user who is currently logged in. This should be called after' +
      ' the user is redirected to the /confirm-link-google-account page.',
    operationId: 'confirmLinkGoogleAccount',
  })
  @ApiBearerAuth()
  @Post('confirm-link-google-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  confirmLinkGoogleAccount(
    @AuthUser() user: User,
    @Body() body: ConfirmLinkAccountDto,
  ): Promise<UserResponse> {
    return this.confirmLinkOAuth2Account(OAuth2ProviderType.GOOGLE, user, body);
  }

  @ApiOperation({
    summary: 'Confirm Microsoft account linking',
    description:
      'Confirm that the Microsoft account in the encryptedEntity should be linked to the' +
      ' account of the user who is currently logged in. This should be called after' +
      ' the user is redirected to the /confirm-link-microsoft-account page.',
    operationId: 'confirmLinkMicrosoftAccount',
  })
  @ApiBearerAuth()
  @Post('confirm-link-microsoft-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  confirmLinkMicrosoftAccount(
    @AuthUser() user: User,
    @Body() body: ConfirmLinkAccountDto,
  ): Promise<UserResponse> {
    return this.confirmLinkOAuth2Account(
      OAuth2ProviderType.MICROSOFT,
      user,
      body,
    );
  }
}
