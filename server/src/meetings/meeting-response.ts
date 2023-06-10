import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeetingRespondent {
  @ApiProperty({ example: 1 })
  respondentID: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: ['2022-10-23T10:00:00Z', '2022-10-23T10:30:00Z'] })
  availabilities: string[];
}

export default class MeetingResponse {
  @ApiProperty({ example: 'Pm9OwtKWxeRQ' })
  meetingID: string;

  @ApiProperty({ example: 'Some meeting' })
  name: string;

  @ApiProperty({ example: 'Some meeting description' })
  about: string;

  @ApiProperty({ example: 'America/Toronto' })
  timezone: string;

  @ApiProperty({ example: 10.5 })
  minStartHour: number;

  @ApiProperty({ example: 13.5 })
  maxEndHour: number;

  @ApiProperty({ example: ['2022-10-23', '2022-10-24'] })
  tentativeDates: string[];

  @ApiProperty({ example: '2022-10-23T10:00:00Z' })
  @ApiPropertyOptional()
  scheduledStartDateTime?: string;

  @ApiProperty({ example: '2022-10-23T10:30:00Z' })
  @ApiPropertyOptional()
  scheduledEndDateTime?: string;

  @ApiProperty({ type: () => MeetingRespondent, isArray: true })
  respondents: MeetingRespondent[];

  @ApiProperty({
    description:
      'The respondent ID of the calling user, if they are logged in and previously' +
      ' submitted their availabilities for this meeting.',
    example: 1,
  })
  @ApiPropertyOptional()
  selfRespondentID?: number;
}
