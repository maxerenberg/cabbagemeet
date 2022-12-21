import { ApiProperty } from '@nestjs/swagger';
import IsCustomISO8601String from './custom-iso8601.decorator';

export default class ScheduleMeetingDto {
  @ApiProperty({
    description:
      'The datetime when the meeting should begin, in UTC. Must be a multiple of 15 minutes. ' +
      'The datetime must be formatted as YYYY-MM-DDTHH:mm:ssZ.',
    example: '2022-10-23T10:00:00Z',
  })
  @IsCustomISO8601String({ message: 'invalid startDateTime' })
  startDateTime: string;

  @ApiProperty({
    description:
      'The datetime when the meeting should end, in UTC. Must be a multiple of 15 minutes. ' +
      'The datetime must be formatted as YYYY-MM-DDTHH:mm:ssZ.',
    example: '2022-10-23T10:30:00Z',
  })
  @IsCustomISO8601String({ message: 'invalid endDateTime' })
  endDateTime: string;
}
