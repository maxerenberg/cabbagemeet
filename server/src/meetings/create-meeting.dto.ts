import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  ArrayNotEmpty,
  ArrayMaxSize,
} from 'class-validator';
import IsOnlyDateString from './date-string-validator.decorator';
import IsStartOfQuarterHourInterval from './quarter-hour-validator.decorator';
import IsTzDatabaseTimezone from './timezone-validator.decorator';

export default class CreateMeetingDto {
  @ApiProperty({ example: 'Some meeting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiProperty({ example: 'Some meeting description' })
  @IsString()
  @MaxLength(256)
  about: string;

  @ApiProperty({
    description: "The client's timezone (IANA tz database format)",
    example: 'America/Toronto',
  })
  @IsTzDatabaseTimezone()
  timezone: string;

  @ApiProperty({
    description:
      "The earliest time, in the client's timezone, at which the meeting may start (24h clock)." +
      ' Must be a multiple of 0.25.',
    example: 10.5,
  })
  @IsStartOfQuarterHourInterval()
  minStartHour: number;

  @ApiProperty({
    description:
      "The latest time, in the client's timezone, at which the meeting may end (24h clock)." +
      ' Must be a multiple of 0.25.',
    example: 13.5,
  })
  @IsStartOfQuarterHourInterval()
  maxEndHour: number;

  @ApiProperty({ example: ['2022-10-23', '2022-10-24'] })
  @ArrayNotEmpty()
  @ArrayMaxSize(30)
  @IsOnlyDateString({ each: true })
  tentativeDates: string[];
}
