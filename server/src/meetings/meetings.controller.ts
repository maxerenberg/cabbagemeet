import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { AuthUser, MaybeAuthUser } from 'src/auth/auth-user.decorator';
import JwtAuthGuard from 'src/auth/jwt-auth.guard';
import OptionalJwtAuthGuard from 'src/auth/optional-jwt-auth.guard';
import User from 'src/users/user.entity';
import CreateMeetingDto from './create-meeting.dto';
import MeetingResponse from './meeting-response';
import Meeting from './meeting.entity';
import MeetingsService from './meetings.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags, ApiForbiddenResponse } from '@nestjs/swagger';
import { BadRequestResponse, NotFoundResponse, ForbiddenResponse } from '../common-responses';
import OAuth2Service from '../oauth2/oauth2.service';
import PutRespondentDto from './put-respondent.dto';
import AddGuestRespondentDto from './add-guest-respondent.dto';
import EditMeetingDto from './edit-meeting.dto';
import ScheduleMeetingDto from './schedule-meeting.dto';
import { ModuleRef } from '@nestjs/core';
import type MeetingShortResponse from './meeting-short-response';

const modifyMeetingAuthzDoc = (
  'If the meeting was created by a registed user, then '
  + 'the client must be logged in as that user.'
);

export function meetingToMeetingShortResponse(meeting: Meeting): MeetingShortResponse {
  const response: MeetingShortResponse = {
    meetingID: meeting.ID,
    name: meeting.Name,
    about: meeting.About,
    timezone: meeting.Timezone,
    minStartHour: meeting.MinStartHour,
    maxEndHour: meeting.MaxEndHour,
    tentativeDates: JSON.parse(meeting.TentativeDates),
  };
  if (meeting.ScheduledStartDateTime && meeting.ScheduledEndDateTime) {
    response.scheduledStartDateTime = meeting.ScheduledStartDateTime;
    response.scheduledEndDateTime = meeting.ScheduledEndDateTime;
  }
  return response;
}

function meetingToMeetingResponse(
  meeting: Meeting,
  callingUser: User | null,
): MeetingResponse {
  const response: MeetingResponse = {
    ...meetingToMeetingShortResponse(meeting),
    // Make sure to use a left join
    respondents: meeting.Respondents.map(respondent => ({
      respondentID: respondent.RespondentID,
      name: respondent.User?.Name ?? respondent.GuestName!,
      availabilities: JSON.parse(respondent.Availabilities),
    })),
  };
  if (callingUser) {
    for (const respondent of meeting.Respondents) {
      if (respondent.UserID === callingUser.ID) {
        response.selfRespondentID = respondent.RespondentID;
        break;
      }
    }
  }
  return response;
}

function meetingDtoToMeetingEntity(body: Partial<CreateMeetingDto>): DeepPartial<Meeting> {
  const meeting: DeepPartial<Meeting> = {};
    if (body.hasOwnProperty('name')) meeting.Name = body.name;
    if (body.hasOwnProperty('about')) meeting.About = body.about;
    if (body.hasOwnProperty('timezone')) meeting.Timezone = body.timezone;
    if (body.hasOwnProperty('minStartHour')) meeting.MinStartHour = body.minStartHour;
    if (body.hasOwnProperty('maxEndHour')) meeting.MaxEndHour = body.maxEndHour;
    if (body.hasOwnProperty('tentativeDates')) meeting.TentativeDates = JSON.stringify(body.tentativeDates.sort());
    return meeting;
}

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  private oauth2Service: OAuth2Service;

  constructor(
    private meetingsService: MeetingsService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // circular dependency
    this.oauth2Service = this.moduleRef.get(OAuth2Service, {strict: false});
  }

  private async checkIfRespondentExistsAndClientIsAllowedToModifyThem(
    respondentID: number,
    maybeUser: User | null
  ) {
    const existingRespondent = await this.meetingsService.getRespondent(respondentID);
    if (!existingRespondent) {
      throw new NotFoundException();
    }
    if (existingRespondent.UserID && (!maybeUser || maybeUser.ID !== existingRespondent.UserID)) {
      throw new ForbiddenException('You must be logged in as this user to modify their availabilities');
    }
  }

  private async checkIfMeetingExistsAndClientIsAllowedToModifyIt(
    meetingID: number,
    maybeUser: User | null
  ) {
    const meeting = await this.meetingsService.getMeetingWithRespondents(meetingID);
    if (!meeting) {
      throw new NotFoundException();
    }
    if (meeting.CreatorID && (!maybeUser || maybeUser.ID !== meeting.CreatorID)) {
      throw new ForbiddenException('You must be logged in as the creator of this meeting.');
    }
    return meeting;
  }

  @ApiOperation({
    summary: 'Create a meeting',
    description: (
      'Create a new meeting. If the client is authenticated when executing this request,' +
      ' they will be registered as the meeting\'s creator. Otherwise, the meeting will' +
      ' have no creator.'
    ),
    operationId: 'createMeeting',
  })
  @ApiBadRequestResponse({type: BadRequestResponse})
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async createMeeting(
    @Body() body: CreateMeetingDto,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const partialMeeting= meetingDtoToMeetingEntity(body);
    if (maybeUser) {
      partialMeeting.CreatorID = maybeUser.ID;
    }
    const meeting = await this.meetingsService.createMeeting(partialMeeting);
    // Normally we would do a left join to get the respondents
    // Since we just created the meeting, this field will be undefined
    meeting.Respondents = [];
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Get a meeting',
    description: 'Retrieve the information about a meeting.',
    operationId: 'getMeeting',
  })
  @ApiBadRequestResponse({type: BadRequestResponse})
  @ApiNotFoundResponse({type: NotFoundResponse})
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const meeting = await this.meetingsService.getMeetingWithRespondents(meetingID);
    if (!meeting) {
      throw new NotFoundException();
    }
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Edit a meeting',
    description: 'Edit a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'editMeeting',
  })
  @ApiBadRequestResponse({type: BadRequestResponse})
  @ApiNotFoundResponse({type: NotFoundResponse})
  @ApiForbiddenResponse({type: ForbiddenResponse})
  @Patch(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async editMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @Body() body: EditMeetingDto,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const meeting = await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(meetingID, maybeUser);
    const partialUpdate = meetingDtoToMeetingEntity(body);
    if (Object.keys(partialUpdate).length === 0) {
      throw new BadRequestException('At least one property must be specified');
    }
    const updatedMeeting = await this.meetingsService.updateMeeting(meetingID, partialUpdate);
    if (
      updatedMeeting.ScheduledStartDateTime !== null
      && updatedMeeting.ScheduledEndDateTime !== null
      && (
        meeting.Name !== updatedMeeting.Name
        || meeting.About !== updatedMeeting.About
      )
    ) {
      // All of the respondents' Google calendars need to be updated.
      // Since this could take a long time, and we do not want to block the
      // client for too long, we do not 'await' the promise below.
      this.oauth2Service.google_tryCreateOrUpdateEventsForMeeting(
        meeting, meeting.ScheduledStartDateTime, meeting.ScheduledEndDateTime
      );
    }
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Schedule a meeting',
    description: 'Schedule a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'scheduleMeeting',
  })
  @ApiBadRequestResponse({type: BadRequestResponse})
  @ApiNotFoundResponse({type: NotFoundResponse})
  @ApiForbiddenResponse({type: ForbiddenResponse})
  @Put(':id/schedule')
  @UseGuards(OptionalJwtAuthGuard)
  async scheduleMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @Body() body: ScheduleMeetingDto,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    if (body.endDateTime <= body.startDateTime) {
      throw new BadRequestException('end time must be greater than start time');
    }
    await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(meetingID, maybeUser);
    const updatedInfo: DeepPartial<Meeting> = {
      ScheduledStartDateTime: body.startDateTime,
      ScheduledEndDateTime: body.endDateTime,
    };
    const meeting = await this.meetingsService.updateMeeting(meetingID, updatedInfo);
    // We need to add the meeting to all of the respondents' Google calendars.
    // Since this could take a long time, and we do not want to block the
    // client for too long, we do not 'await' the promise below.
    this.oauth2Service.google_tryCreateOrUpdateEventsForMeeting(
      meeting, body.startDateTime, body.endDateTime
    );
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Unschedule a meeting',
    description: 'Unschedule a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'unscheduleMeeting',
  })
  @ApiNotFoundResponse({type: NotFoundResponse})
  @ApiForbiddenResponse({type: ForbiddenResponse})
  @Delete(':id/schedule')
  @UseGuards(OptionalJwtAuthGuard)
  async unscheduleMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(meetingID, maybeUser);
    const updatedInfo: DeepPartial<Meeting> = {
      ScheduledStartDateTime: null,
      ScheduledEndDateTime: null,
    };
    const meeting = await this.meetingsService.updateMeeting(meetingID, updatedInfo);
    // We need to delete the meeting from all of the respondents' Google calendars.
    // Since this could take a long time, and we do not want to block the
    // client for too long, we do not 'await' the promise below.
    this.oauth2Service.google_tryDeleteEventsForMeeting(meetingID);
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Delete a meeting',
    description: 'Delete a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'deleteMeeting',
  })
  @ApiNotFoundResponse({type: NotFoundResponse})
  @ApiForbiddenResponse({type: ForbiddenResponse})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(OptionalJwtAuthGuard)
  async deleteMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<void> {
    await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(meetingID, maybeUser);
    // This meeting needs to be deleted from all of the respondents' Google calendars.
    // We need to wait until this runs to completion or else the row in
    // the GoogleCalendarCreatedEvents table might be deleted prematurely
    // (due to cascading deletions).
    // Unfortunately this might take a long time, but since deleting a meeting is a
    // relatively infrequent operation, it should be acceptable. The use of
    // Promise.allSettled() in the OAuth2Service should hopefully speed things up.
    await this.oauth2Service.google_tryDeleteEventsForMeeting(meetingID);
    await this.meetingsService.deleteMeeting(meetingID);
  }

  // TODO: email notifications for when people add availabilities or meeting
  // is scheduled

  @ApiOperation({
    summary: 'Add guest availabilities',
    description: 'Add the meeting availabilities for a guest user.',
    operationId: 'addGuestRespondent',
  })
  @Post(':id/respondents/guest')
  @HttpCode(HttpStatus.OK)
  async addGuestRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @Body() body: AddGuestRespondentDto,
  ): Promise<MeetingResponse> {
    await this.meetingsService.addRespondent(meetingID, body.availabilities, body.name, body.email);
    const updatedMeeting = await this.meetingsService.getMeetingWithRespondents(meetingID);
    return meetingToMeetingResponse(updatedMeeting!, null);
  }

  @ApiOperation({
    summary: 'Add or update own availabilities',
    description: 'Add or update the meeting availabilities of the user who is currently logged in.',
    operationId: 'putSelfRespondent',
  })
  @ApiForbiddenResponse({type: ForbiddenResponse})
  @ApiBearerAuth()
  @Put(':id/respondents/me')
  @UseGuards(JwtAuthGuard)
  async putSelfRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @AuthUser() user: User,
    @Body() body: PutRespondentDto,
  ): Promise<MeetingResponse> {
    const existingRespondent = await this.meetingsService.getRespondent(meetingID, user.ID);
    if (existingRespondent) {
      await this.meetingsService.updateRespondent(existingRespondent.RespondentID, body.availabilities);
    } else {
      await this.meetingsService.addRespondent(meetingID, body.availabilities, user.ID);
    }
    const updatedMeeting = await this.meetingsService.getMeetingWithRespondents(meetingID);
    // Add the meeting to the user's Google calendar, if applicable.
    // The promise below is not awaited to speed up the response.
    this.oauth2Service.google_tryCreateEventForMeeting(user.ID, updatedMeeting);
    return meetingToMeetingResponse(updatedMeeting!, user);
  }

  @ApiOperation({
    summary: 'Update availabilities',
    description: (
      'Update the meeting availabilities of an existing respondent.<br><br>'
      + 'If the respondent is a registered user, then the client must be logged in as that user.'
    ),
    operationId: 'updateAvailabilities',
  })
  @ApiForbiddenResponse({type: ForbiddenResponse})
  @Put(':id/respondents/:respondentID')
  @UseGuards(OptionalJwtAuthGuard)
  async updateRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @Param('respondentID', ParseIntPipe) respondentID: number,
    @MaybeAuthUser() maybeUser: User | null,
    @Body() body: PutRespondentDto,
  ): Promise<MeetingResponse> {
    await this.checkIfRespondentExistsAndClientIsAllowedToModifyThem(respondentID, maybeUser);
    await this.meetingsService.updateRespondent(respondentID, body.availabilities);
    const updatedMeeting = await this.meetingsService.getMeetingWithRespondents(meetingID);
    return meetingToMeetingResponse(updatedMeeting!, maybeUser);
  }

  @ApiOperation({
    summary: 'Delete a respondent',
    description: (
      'Remove a respondent from a meeting.<br><br>'
      + 'If the respondent is a registered user, then the client must be logged in as that user.'
    ),
    operationId: 'deleteRespondent',
  })
  @Delete(':id/respondents/:respondentID')
  @UseGuards(OptionalJwtAuthGuard)
  async deleteRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @Param('respondentID', ParseIntPipe) respondentID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    await this.checkIfRespondentExistsAndClientIsAllowedToModifyThem(respondentID, maybeUser);
    if (maybeUser) {
      // We need to wait until this runs to completion or else the row in
      // the GoogleCalendarCreatedEvents table might be deleted prematurely
      // (due to cascading deletions).
      await this.oauth2Service.google_tryDeleteEventForMeeting(maybeUser.ID, meetingID);
    }
    await this.meetingsService.deleteRespondent(respondentID);
    const updatedMeeting = await this.meetingsService.getMeetingWithRespondents(meetingID);
    return meetingToMeetingResponse(updatedMeeting!, maybeUser);
  }
}
