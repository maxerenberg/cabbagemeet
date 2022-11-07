import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, ParseIntPipe, Patch, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { DeepPartial } from 'typeorm';
import { GoogleCalendarEvent } from '../oauth2/google-calendar-events.entity';
import { AuthUser } from '../auth/auth-user.decorator';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import {
  NotFoundResponse,
  UnauthorizedResponse,
  CustomRedirectResponse,
} from '../common-responses';
import { meetingToMeetingShortResponse } from '../meetings/meetings.controller';
import MeetingsService, { NoSuchMeetingError } from '../meetings/meetings.service';
import OAuth2Service, { OAuth2Provider, OAuth2NotConfiguredError, OAuth2Reason } from '../oauth2/oauth2.service';
import EditUserDto from './edit-user.dto';
import GoogleCalendarEventsResponse from './google-calendar-events.response';
import LinkExternalCalendarDto from './link-external-calendar.dto';
import { MeetingsShortResponse } from '../meetings/meeting-short-response';
import UserResponse from './user-response';
import User from './user.entity';
import UsersService from './users.service';

export function UserToUserResponse(user: User): UserResponse {
  return {
    userID: user.ID,
    name: user.Name,
    email: user.Email,
    isSubscribedToNotifications: user.IsSubscribedToNotifications,
    hasLinkedGoogleAccount: !!user.GoogleOAuth2,
  };
}

@ApiTags('me')
@ApiCookieAuth()
@ApiUnauthorizedResponse({type: UnauthorizedResponse})
@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private oauth2Service: OAuth2Service;

  constructor(
    private meetingsService: MeetingsService,
    private usersService: UsersService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // circular dependency
    this.oauth2Service = this.moduleRef.get(OAuth2Service, {strict: false});
  }

  @ApiOperation({
    summary: 'Get user information',
    description: 'Get information for the user who is currently logged in',
    operationId: 'getSelfInfo',
  })
  @Get()
  getUserInfo(@AuthUser() user: User): UserResponse {
    return UserToUserResponse(user);
  }

  @ApiOperation({
    summary: 'Edit user information',
    description: 'Edit information for the user who is currently logged in',
    operationId: 'editUser',
  })
  @Patch()
  async updateUserInfo(
    @AuthUser() user: User,
    @Body() body: EditUserDto
  ): Promise<UserResponse> {
    const updateInfo: DeepPartial<User> = {};
    if (body.name) updateInfo.Name = body.name;
    if (body.email) updateInfo.Email = body.email;
    if (body.hasOwnProperty('subscribe_to_notifications')) updateInfo.IsSubscribedToNotifications = body.subscribe_to_notifications;
    if (Object.keys(updateInfo).length === 0) {
      throw new BadRequestException('at least one property must be present');
    }
    const updatedUser = await this.usersService.editUser(user.ID, updateInfo);
    return UserToUserResponse(updatedUser);
  }

  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete the account of the user who is currently logged in',
    operationId: 'deleteUser',
  })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@AuthUser() user: User) {
    await this.usersService.deleteUser(user.ID);
  }

  @ApiOperation({
    summary: 'Get created meetings',
    description: 'Get meetings created by the user who is currently logged in',
    operationId: 'getCreatedMeetings',
  })
  @Get('created-meetings')
  async getCreatedMeetings(@AuthUser() user: User): Promise<MeetingsShortResponse> {
    const meetings = await this.meetingsService.getMeetingsCreatedBy(user.ID);
    return {
      meetings: meetings.map(meetingToMeetingShortResponse)
    };
  }

  @ApiOperation({
    summary: 'Get responded meetings',
    description: 'Get meetings to which the user who is currently logged in has responded',
    operationId: 'getRespondedMeetings',
  })
  @Get('responded-meetings')
  async getRespondedMeetings(@AuthUser() user: User): Promise<MeetingsShortResponse> {
    const meetings = await this.meetingsService.getMeetingsRespondedToBy(user.ID);
    return {
      meetings: meetings.map(meetingToMeetingShortResponse)
    };
  }

  private redirectToGoogle(userID: number, reason: OAuth2Reason, postRedirect: string): string {
    try {
      return this.oauth2Service.getRequestURL(
        OAuth2Provider.GOOGLE, {reason, postRedirect, userID}
      );
    } catch (err: any) {
      if (err instanceof OAuth2NotConfiguredError) {
        throw new NotFoundException();
      }
      throw err;
    }
  }

  @ApiOperation({
    summary: 'Link Google calendar',
    description: (
      'Link Google calendar events to the account of the user who is logged in.'
      + ' The client should navigate to the returned OAuth2 consent page URL.'
    ),
    operationId: 'linkGoogleCalendar',
  })
  @ApiResponse({type: NotFoundResponse})
  @Post('link-google-calendar')
  @HttpCode(HttpStatus.OK)
  linkGoogleCalendar(
    @AuthUser() user: User,
    @Body() body: LinkExternalCalendarDto,
  ): CustomRedirectResponse {
    return {
      redirect: this.redirectToGoogle(user.ID, 'link', body.post_redirect)
    };
  }

  @ApiOperation({
    summary: 'Unlink Google calendar',
    description: (
      'Unlink the Google account which is linked to the account of the user who is logged in.'
      + ' The OAuth2 access token will be revoked.'
    ),
    operationId: 'unlinkGoogleCalendar',
  })
  @Delete('link-google-calendar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkGoogleCalendar(@AuthUser() user: User) {
    await this.oauth2Service.google_unlinkAccount(user.ID);
  }

  @ApiOperation({
    summary: 'Get Google calendar events',
    description: (
      'Get a list of Google calendar events whose dates overlap with'
      + ' the tentative dates of a meeting'
    ),
    operationId: 'getGoogleCalendarEvents',
  })
  @Get('google-calendar-events')
  async getGoogleCalendarEvents(
    @AuthUser() user: User,
    @Query('meetingID', ParseIntPipe) meetingID: number,
  ): Promise<GoogleCalendarEventsResponse> {
    let events: GoogleCalendarEvent[];
    try {
      events = await this.oauth2Service.google_getEventsForMeeting(user.ID, meetingID);
    } catch (err: any) {
      if (err instanceof NoSuchMeetingError) {
        throw new NotFoundException();
      }
      throw err;
    }
    return {
      events: events.map(event => ({
        summary: event.summary,
        startDateTime: event.start,
        endDateTime: event.end,
      }))
    };
  }
}
