import { Body, Controller, Delete, Get, HttpCode, NotFoundException, ParseIntPipe, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GoogleCalendarEvent } from 'src/oauth2/google-calendar-events.entity';
import { AuthUser } from '../auth/auth-user.decorator';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import { NotFoundResponse, UnauthorizedResponse } from '../common-responses';
import MeetingsService, { MeetingShort, NoSuchMeetingError } from '../meetings/meetings.service';
import OAuth2Service, { OAuth2Provider, OAuth2NotConfiguredError, OAuth2Reason } from '../oauth2/oauth2.service';
import GoogleCalendarEventsResponse from './google-calendar-events.response';
import LinkExternalCalendarDto from './link-external-calendar.dto';
import MeetingShortResponse from './meeting-short-response';
import UserResponse from './user-response';
import User from './user.entity';

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
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // circular dependency
    this.oauth2Service = this.moduleRef.get(OAuth2Service, {strict: false});
  }

  private meetingsShortToMeetingsShortResponse(meetings: MeetingShort[]): MeetingShortResponse[] {
    return meetings.map(meeting => {
      const resp: MeetingShortResponse = {
        meetingID: meeting.ID,
        name: meeting.Name,
        minStartHour: meeting.MinStartHour,
        maxEndHour: meeting.MaxEndHour,
        tentativeDates: JSON.parse(meeting.TentativeDates),
      };
      if (meeting.ScheduledStartDateTime) {
        resp.scheduledStartDateTime = meeting.ScheduledStartDateTime;
      }
      return resp;
    });
  }

  @ApiOperation({
    summary: 'Get user information',
    description: 'Get information for the user who is currently logged in',
  })
  @Get()
  getUserInfo(@AuthUser() user: User): UserResponse {
    return UserToUserResponse(user);
  }

  @ApiOperation({
    summary: 'Get created meetings',
    description: 'Get meetings created by the user who is currently logged in',
  })
  @Get('created-meetings')
  async getCreatedMeetings(@AuthUser() user: User): Promise<MeetingShortResponse[]> {
    const meetings = await this.meetingsService.getMeetingsCreatedBy(user.ID);
    return this.meetingsShortToMeetingsShortResponse(meetings);
  }

  @ApiOperation({
    summary: 'Get responded meetings',
    description: 'Get meetings to which the user who is currently logged in has responded',
  })
  @Get('responded-meetings')
  async getRespondedMeetings(@AuthUser() user: User): Promise<MeetingShortResponse[]> {
    const meetings = await this.meetingsService.getMeetingsRespondedToBy(user.ID);
    return this.meetingsShortToMeetingsShortResponse(meetings);
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
    description: 'Link Google calendar events to the account of the user who is logged in',
  })
  @ApiResponse({type: NotFoundResponse})
  @Post('link-google-calendar')
  @Redirect()
  async linkGoogleCalendar(
    @AuthUser() user: User,
    @Body() body: LinkExternalCalendarDto,
  ) {
    return {url: this.redirectToGoogle(user.ID, 'link', body.post_redirect)};
  }

  @ApiOperation({
    summary: 'Unlink Google calendar',
    description: (
      'Unlink the Google account which is linked to the account of the user who is logged in.'
      + ' The OAuth2 access token will be revoked.'
    ),
  })
  @Delete('link-google-calendar')
  @HttpCode(204)
  async unlinkGoogleCalendar(@AuthUser() user: User) {
    await this.oauth2Service.google_unlinkAccount(user.ID);
  }

  @ApiOperation({
    summary: 'Get Google calendar events',
    description: (
      'Get a list of Google calendar events whose dates overlap with'
      + ' the tentative dates of a meeting'
    ),
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
