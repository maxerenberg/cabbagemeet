import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, ParseIntPipe, Patch, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { OAuth2CalendarEvent } from '../oauth2/oauth2-common';
import { AuthUser } from '../auth/auth-user.decorator';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import {
  NotFoundResponse,
  UnauthorizedResponse,
  CustomRedirectResponse,
} from '../common-responses';
import { meetingToMeetingShortResponse } from '../meetings/meetings.controller';
import MeetingsService, { NoSuchMeetingError } from '../meetings/meetings.service';
import OAuth2Service from '../oauth2/oauth2.service';
import { OAuth2ProviderType, OAuth2NotConfiguredError } from '../oauth2/oauth2-common';
import EditUserDto from './edit-user.dto';
import OAuth2CalendarEventsResponse from './oauth2-calendar-events.response';
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
    hasLinkedGoogleAccount: user.GoogleOAuth2?.LinkedCalendar ?? false,
    hasLinkedMicrosoftAccount: user.MicrosoftOAuth2?.LinkedCalendar ?? false,
  };
}

@ApiTags('me')
@ApiBearerAuth()
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

  // TODO: create separate endpoint for user to edit their email address
  // (requires email address validation + rate limiting)

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
    const updateInfo: Partial<User> = {};
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

  private async linkCalendar(
    providerType: OAuth2ProviderType,
    user: User,
    body: LinkExternalCalendarDto
  ): Promise<CustomRedirectResponse> {
    // TODO: if the user already has a linked calendar, ignore
    // TODO: if the user already has OAuth2 creds, just set the linked calendar
    //       flag to true in the DB
    try {
      const redirectURL = await this.oauth2Service.getRequestURL(
        providerType,
        {reason: 'link', postRedirect: body.post_redirect, userID: user.ID},
        true
      );
      return {redirect: redirectURL};
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
  ): Promise<CustomRedirectResponse> {
    return this.linkCalendar(OAuth2ProviderType.GOOGLE, user, body);
  }

  @ApiOperation({
    summary: 'Link Outlook calendar',
    description: (
      'Link Outlook calendar events to the account of the user who is logged in.'
      + ' The client should navigate to the returned OAuth2 consent page URL.'
    ),
    operationId: 'linkMicrosoftCalendar',
  })
  @ApiResponse({type: NotFoundResponse})
  @Post('link-microsoft-calendar')
  @HttpCode(HttpStatus.OK)
  linkMicrosoftCalendar(
    @AuthUser() user: User,
    @Body() body: LinkExternalCalendarDto,
  ): Promise<CustomRedirectResponse> {
    return this.linkCalendar(OAuth2ProviderType.MICROSOFT, user, body);
  }

  private async unlinkCalendar(providerType: OAuth2ProviderType, user: User): Promise<UserResponse> {
    await this.oauth2Service.unlinkAccount(providerType, user.ID);
    const updatedUser = await this.usersService.findOneByID(user.ID);
    return UserToUserResponse(updatedUser);
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
  @HttpCode(HttpStatus.OK)
  unlinkGoogleCalendar(@AuthUser() user: User): Promise<UserResponse> {
    return this.unlinkCalendar(OAuth2ProviderType.GOOGLE, user);
  }

  @ApiOperation({
    summary: 'Unlink Outlook calendar',
    description: (
      'Unlink the Microsoft account which is linked to the account of the user who is logged in.'
      + ' The OAuth2 access token will be revoked.'
    ),
    operationId: 'unlinkMicrosoftCalendar',
  })
  @Delete('link-microsoft-calendar')
  @HttpCode(HttpStatus.OK)
  unlinkMicrosoftCalendar(@AuthUser() user: User): Promise<UserResponse> {
    return this.unlinkCalendar(OAuth2ProviderType.MICROSOFT, user);
  }

  private async getOAuth2CalendarEvents(
    providerType: OAuth2ProviderType,
    user: User,
    meetingID: number,
  ): Promise<OAuth2CalendarEventsResponse> {
    let events: OAuth2CalendarEvent[];
    try {
      events = await this.oauth2Service.getEventsForMeeting(providerType, user.ID, meetingID);
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

  @ApiOperation({
    summary: 'Get Google calendar events',
    description: (
      'Get a list of Google calendar events whose dates overlap with'
      + ' the tentative dates of a meeting'
    ),
    operationId: 'getGoogleCalendarEvents',
  })
  @Get('google-calendar-events')
  getGoogleCalendarEvents(
    @AuthUser() user: User,
    @Query('meetingID', ParseIntPipe) meetingID: number,
  ): Promise<OAuth2CalendarEventsResponse> {
    return this.getOAuth2CalendarEvents(OAuth2ProviderType.GOOGLE, user, meetingID);
  }

  @ApiOperation({
    summary: 'Get Microsoft calendar events',
    description: (
      'Get a list of Outlook calendar events whose dates overlap with'
      + ' the tentative dates of a meeting'
    ),
    operationId: 'getMicrosoftCalendarEvents',
  })
  @Get('microsoft-calendar-events')
  getMicrosoftCalendarEvents(
    @AuthUser() user: User,
    @Query('meetingID', ParseIntPipe) meetingID: number,
  ): Promise<OAuth2CalendarEventsResponse> {
    return this.getOAuth2CalendarEvents(OAuth2ProviderType.MICROSOFT, user, meetingID);
  }
}
