import {
  Controller,
  Get,
  Logger,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from 'src/auth/auth-user.decorator';
import JwtAuthGuard from 'src/auth/jwt-auth.guard';
import CustomJwtService from 'src/custom-jwt/custom-jwt.service';
import { assertIsNever } from 'src/misc.utils';
import User from 'src/users/user.entity';
import OAuth2Service, {
  oauth2Reasons,
  OAuth2State,
  OAuth2NotConfiguredError,
  OAuth2Provider,
  OAuth2AccountAlreadyLinkedError,
  OAuth2NotAllScopesGrantedError,
} from './oauth2.service';

@Controller()
export class Oauth2Controller {
  private readonly logger = new Logger(Oauth2Controller.name);

  constructor(
    private oauth2Service: OAuth2Service,
    private jwtService: CustomJwtService,
  ) {}

  private stateIsValid(state: any): boolean {
    return typeof state === 'object'
        && typeof state.reason === 'string'
        && oauth2Reasons.some(reason => state.reason === reason)
        && (state.reason !== 'link' || typeof state.userID === 'number')
        && typeof state.postRedirect === 'string';
  }

  private redirectWithToken(res: Response, redirectURL: string, user: User) {
    // We need to "push" the response to the client
    const serializedUserJwt = this.jwtService.serializeUserToJwt(user);
    // Ugggghhhhhhh...
    if (redirectURL.includes('?')) {
      res.redirect(redirectURL + `&token=${serializedUserJwt}`);
    } else {
      res.redirect(redirectURL + `?token=${serializedUserJwt}`);
    }
  }

  @Get('redirect/google')
  async googleRedirect(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') stateStr?: string,
    @Query('error') error?: string,
  ) {
    if (error) {
      this.logger.error(error);
      // TODO: redirect to a nice-looking error page
      res.status(500).contentType('text/plain').send('Internal server error');
      return;
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
        this.redirectWithToken(res, state.postRedirect, user);
      } else if (state.reason === 'login') {
        const {
          user,
          isLinkedToAccountFromOIDCResponse,
          pendingOAuth2Entity,
        } = await this.oauth2Service.google_handleLogin(code, state);
        if (isLinkedToAccountFromOIDCResponse) {
          // The user explicitly linked their account with Google (either by signing
          // up with Google initially, or by clicking 'Link account' from the settings
          // page). We should successfully log them in.
          this.redirectWithToken(res, state.postRedirect, user);
        } else if (user) {
          // The user signed up with this Gmail account, but never linked the account
          // via the settings page. We need them to confirm whether they want
          // to link the accounts together.
          const serializedUserJwt = this.jwtService.serializeUserToJwt(user);
          // To avoid showing OAuth2 tokens in the browser URL bar, we encrypt the
          // entity first
          const {
            encrypted: encryptedEntity,
            iv,
            salt,
          } = await this.jwtService.encryptText(JSON.stringify(pendingOAuth2Entity!));
          res.redirect(
            '/confirm-link-google-account?'
            + `postRedirect=${encodeURIComponent(state.postRedirect)}`
            + `&token=${serializedUserJwt}`
            + `&encryptedEntity=${encryptedEntity.toString('base64url')}`
            + `&iv=${iv.toString('base64url')}`
            + `&salt=${salt.toString('base64url')}`
          );
        } else {
          // The local account associated with this Google account no longer exists.
          // We need to force the user to go through the consent screen again
          // so that we can get a new refresh token.
          res.redirect(this.oauth2Service.getRequestURL(OAuth2Provider.GOOGLE, {
            postRedirect: '/',
            reason: 'signup',
          }));
        }
      } else {
        assertIsNever(state.reason);
      }
    } catch (err: any) {
      // TODO: show a nice error message page
      if (err instanceof OAuth2NotConfiguredError) {
        res.status(403).contentType('text/plain').send('Google OAuth2 not available');
      } else if (err instanceof OAuth2AccountAlreadyLinkedError) {
        res.status(409).contentType('text/plain').send(
          'This Google account is already linked to an existing local account'
        );
      } else if (err instanceof OAuth2NotAllScopesGrantedError) {
        res.status(403).contentType('text/plain').send('Not all OAuth2 scopes were granted');
      } else {
        this.logger.error(err);
        res.status(500).contentType('text/plain').send('Internal server error');
      }
    }
  }
}
