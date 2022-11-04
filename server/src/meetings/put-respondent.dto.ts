import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize } from 'class-validator';
import IsCustomISO8601String from './custom-iso8601.decorator';

export default class PutRespondentDto {
  @ApiProperty({
    description: (
      'The starting times of the 30-minute intervals during which the' +
      ' respondent is available (UTC). Each datetime string MUST have' +
      ' the format `YYYY-MM-DDTHH:mm:ssZ`.'
    ),
    example: ['2022-10-23T10:00:00Z', '2022-10-23T10:30:00Z']
  })
  @ArrayMaxSize(512)
  @IsCustomISO8601String({each: true})
  availabilities: string[];
}
