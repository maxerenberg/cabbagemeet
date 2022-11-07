import { ApiProperty } from "@nestjs/swagger";

export default class MeetingResponse {
  @ApiProperty({example: 1})
  meetingID: number;

  @ApiProperty({example: 'Some meeting'})
  name: string;

  @ApiProperty({example: 'Some meeting description'})
  about: string;

  @ApiProperty({example: 'America/Toronto'})
  timezone: string;

  @ApiProperty({example: 10.5})
  minStartHour: number;

  @ApiProperty({example: 13.5})
  maxEndHour: number;

  @ApiProperty({example: [
    '2022-10-23', '2022-10-24'
  ]})
  tentativeDates: string[];

  @ApiProperty({example: '2022-10-23T10:00:00Z'})
  scheduledStartDateTime?: string;

  @ApiProperty({example: '2022-10-23T10:30:00Z'})
  scheduledEndDateTime?: string;

  @ApiProperty({example: [
    {
      respondentID: 1,
      name: 'John Doe',
      availabilities: ['2022-10-23T10:00:00Z', '2022-10-23T10:30:00Z'],
    }
  ]})
  respondents: {
    respondentID: number;
    name: string;
    availabilities: string[];
  }[];

  @ApiProperty({
    description: (
      'The respondent ID of the calling user, if they are logged in and previously'
      + ' submitted their availabilities for this meeting.'
    ),
    example: 1,
  })
  selfRespondentID?: number;
}
