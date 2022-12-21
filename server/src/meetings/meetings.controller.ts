import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Ip,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import ConfigService from '../config/config.service';
import { AuthUser, MaybeAuthUser } from '../auth/auth-user.decorator';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import OptionalJwtAuthGuard from '../auth/optional-jwt-auth.guard';
import User from '../users/user.entity';
import CreateMeetingDto from './create-meeting.dto';
import MeetingResponse from './meeting-response';
import MeetingRespondent from './meeting-respondent.entity';
import Meeting from './meeting.entity';
import MeetingsService from './meetings.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  BadRequestResponse,
  NotFoundResponse,
  ForbiddenResponse,
} from '../common-responses';
import PutRespondentDto from './put-respondent.dto';
import AddGuestRespondentDto from './add-guest-respondent.dto';
import EditMeetingDto from './edit-meeting.dto';
import ScheduleMeetingDto from './schedule-meeting.dto';
import type MeetingShortResponse from './meeting-short-response';
import RateLimiterService, {
  IRateLimiter,
} from '../rate-limiter/rate-limiter.service';
import {
  oneYearAgoDateString,
  oneYearFromNowDateString,
  SECONDS_PER_HOUR,
} from '../dates.utils';

const modifyMeetingAuthzDoc =
  'If the meeting was created by a registed user, then ' +
  'the client must be logged in as that user.';

export function meetingToMeetingShortResponse(
  meeting: Meeting,
): MeetingShortResponse {
  const response: MeetingShortResponse = {
    meetingID: meeting.ID,
    name: meeting.Name,
    about: meeting.About,
    timezone: meeting.Timezone,
    minStartHour: meeting.MinStartHour,
    maxEndHour: meeting.MaxEndHour,
    tentativeDates: meeting.TentativeDates,
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
    respondents: meeting.Respondents.map((respondent) => ({
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

function meetingDtoToMeetingEntity(
  body: Partial<CreateMeetingDto>,
): Partial<Meeting> {
  const meeting: Partial<Meeting> = {};
  if (body.hasOwnProperty('name')) {
    meeting.Name = body.name;
  }
  if (body.hasOwnProperty('about')) {
    meeting.About = body.about;
  }
  if (body.hasOwnProperty('timezone')) {
    meeting.Timezone = body.timezone;
  }
  if (body.hasOwnProperty('minStartHour')) {
    meeting.MinStartHour = body.minStartHour;
  }
  if (body.hasOwnProperty('maxEndHour')) {
    meeting.MaxEndHour = body.maxEndHour;
  }
  if (body.hasOwnProperty('tentativeDates')) {
    meeting.TentativeDates = body.tentativeDates.sort();
  }
  return meeting;
}

function tentativeDatesAreOutOfRange(tentativeDates: string[]): boolean {
  const minDate = tentativeDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = tentativeDates.reduce((a, b) => (a > b ? a : b));
  const oneYearAgo = oneYearAgoDateString();
  const oneYearFromNow = oneYearFromNowDateString();
  return minDate < oneYearAgo || maxDate > oneYearFromNow;
}

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  private meetingCreationRateLimiter: IRateLimiter | undefined;

  constructor(
    private meetingsService: MeetingsService,
    configService: ConfigService,
    rateLimiterService: RateLimiterService,
  ) {
    const meetingCreationLimit = configService.get(
      'HOURLY_MEETING_CREATION_LIMIT_PER_IP'
    );
    if (meetingCreationLimit !== 0) {
      this.meetingCreationRateLimiter = rateLimiterService.factory(
        SECONDS_PER_HOUR,
        meetingCreationLimit,
      );
    }
  }

  private async checkIfRespondentExistsAndClientIsAllowedToModifyThem(
    respondentID: number,
    maybeUser: User | null,
  ): Promise<MeetingRespondent> {
    const existingRespondent = await this.meetingsService.getRespondent(
      respondentID,
    );
    if (!existingRespondent) {
      throw new NotFoundException();
    }
    if (
      existingRespondent.UserID &&
      (!maybeUser || maybeUser.ID !== existingRespondent.UserID)
    ) {
      throw new ForbiddenException(
        'You must be logged in as this user to modify their availabilities',
      );
    }
    return existingRespondent;
  }

  private async checkIfMeetingExistsAndClientIsAllowedToModifyIt(
    meetingID: number,
    maybeUser: User | null,
  ) {
    const meeting = await this.meetingsService.getMeetingWithRespondents(
      meetingID,
    );
    if (!meeting) {
      throw new NotFoundException();
    }
    if (
      meeting.CreatorID &&
      (!maybeUser || maybeUser.ID !== meeting.CreatorID)
    ) {
      throw new ForbiddenException(
        'You must be logged in as the creator of this meeting.',
      );
    }
    return meeting;
  }

  @ApiOperation({
    summary: 'Create a meeting',
    description:
      'Create a new meeting. If the client is authenticated when executing this request,' +
      " they will be registered as the meeting's creator. Otherwise, the meeting will" +
      ' have no creator.',
    operationId: 'createMeeting',
  })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async createMeeting(
    @Ip() ip: string,
    @Body() body: CreateMeetingDto,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    if (
      this.meetingCreationRateLimiter &&
      !(await this.meetingCreationRateLimiter.tryAddRequestIfWithinLimits(ip))
    ) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (tentativeDatesAreOutOfRange(body.tentativeDates)) {
      throw new BadRequestException('Dates are out of the acceptable range');
    }
    const partialMeeting = meetingDtoToMeetingEntity(body);
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
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @ApiNotFoundResponse({ type: NotFoundResponse })
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const meeting = await this.meetingsService.getMeetingWithRespondents(
      meetingID,
    );
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
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @ApiNotFoundResponse({ type: NotFoundResponse })
  @ApiForbiddenResponse({ type: ForbiddenResponse })
  @Patch(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async editMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @Body() body: EditMeetingDto,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const meeting = await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(
      meetingID,
      maybeUser,
    );
    const partialUpdate = meetingDtoToMeetingEntity(body);
    if (Object.keys(partialUpdate).length === 0) {
      throw new BadRequestException('At least one property must be specified');
    }
    await this.meetingsService.editMeeting(meeting, partialUpdate);
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Schedule a meeting',
    description: 'Schedule a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'scheduleMeeting',
  })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @ApiNotFoundResponse({ type: NotFoundResponse })
  @ApiForbiddenResponse({ type: ForbiddenResponse })
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
    const meeting = await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(
      meetingID,
      maybeUser,
    );
    await this.meetingsService.scheduleMeeting(
      maybeUser,
      meeting,
      body.startDateTime,
      body.endDateTime,
    );
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Unschedule a meeting',
    description: 'Unschedule a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'unscheduleMeeting',
  })
  @ApiNotFoundResponse({ type: NotFoundResponse })
  @ApiForbiddenResponse({ type: ForbiddenResponse })
  @Delete(':id/schedule')
  @UseGuards(OptionalJwtAuthGuard)
  async unscheduleMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const meeting = await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(
      meetingID,
      maybeUser,
    );
    await this.meetingsService.unscheduleMeeting(meeting);
    return meetingToMeetingResponse(meeting, maybeUser);
  }

  @ApiOperation({
    summary: 'Delete a meeting',
    description: 'Delete a meeting. ' + modifyMeetingAuthzDoc,
    operationId: 'deleteMeeting',
  })
  @ApiNotFoundResponse({ type: NotFoundResponse })
  @ApiForbiddenResponse({ type: ForbiddenResponse })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(OptionalJwtAuthGuard)
  async deleteMeeting(
    @Param('id', ParseIntPipe) meetingID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<void> {
    await this.checkIfMeetingExistsAndClientIsAllowedToModifyIt(
      meetingID,
      maybeUser,
    );
    await this.meetingsService.deleteMeeting(meetingID);
  }

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
    // TODO: wrap in transaction
    await this.meetingsService.addRespondent(
      meetingID,
      body.availabilities,
      body.name,
      body.email,
    );
    const updatedMeeting = await this.meetingsService.getMeetingWithRespondents(
      meetingID,
    );
    return meetingToMeetingResponse(updatedMeeting!, null);
  }

  @ApiOperation({
    summary: 'Add or update own availabilities',
    description:
      'Add or update the meeting availabilities of the user who is currently logged in.',
    operationId: 'putSelfRespondent',
  })
  @ApiForbiddenResponse({ type: ForbiddenResponse })
  @ApiBearerAuth()
  @Put(':id/respondents/me')
  @UseGuards(JwtAuthGuard)
  async putSelfRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @AuthUser() user: User,
    @Body() body: PutRespondentDto,
  ): Promise<MeetingResponse> {
    const meeting = await this.meetingsService.addOrUpdateRespondent(
      meetingID,
      user.ID,
      body.availabilities,
    );
    return meetingToMeetingResponse(meeting, user);
  }

  @ApiOperation({
    summary: 'Update availabilities',
    description:
      'Update the meeting availabilities of an existing respondent.<br><br>' +
      'If the respondent is a registered user, then the client must be logged in as that user.',
    operationId: 'updateAvailabilities',
  })
  @ApiForbiddenResponse({ type: ForbiddenResponse })
  @Put(':id/respondents/:respondentID')
  @UseGuards(OptionalJwtAuthGuard)
  async updateRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @Param('respondentID', ParseIntPipe) respondentID: number,
    @MaybeAuthUser() maybeUser: User | null,
    @Body() body: PutRespondentDto,
  ): Promise<MeetingResponse> {
    await this.checkIfRespondentExistsAndClientIsAllowedToModifyThem(
      respondentID,
      maybeUser,
    );
    await this.meetingsService.updateRespondent(
      respondentID,
      body.availabilities,
    );
    const updatedMeeting = await this.meetingsService.getMeetingWithRespondents(
      meetingID,
    );
    return meetingToMeetingResponse(updatedMeeting!, maybeUser);
  }

  @ApiOperation({
    summary: 'Delete a respondent',
    description:
      'Remove a respondent from a meeting.<br><br>' +
      'If the respondent is a registered user, then the client must be logged in as that user.',
    operationId: 'deleteRespondent',
  })
  @Delete(':id/respondents/:respondentID')
  @UseGuards(OptionalJwtAuthGuard)
  async deleteRespondent(
    @Param('id', ParseIntPipe) meetingID: number,
    @Param('respondentID', ParseIntPipe) respondentID: number,
    @MaybeAuthUser() maybeUser: User | null,
  ): Promise<MeetingResponse> {
    const respondent =
      await this.checkIfRespondentExistsAndClientIsAllowedToModifyThem(
        respondentID,
        maybeUser,
      );
    const updatedMeeting = await this.meetingsService.deleteRespondent(
      respondent,
    );
    return meetingToMeetingResponse(updatedMeeting, maybeUser);
  }
}
