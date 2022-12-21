import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import PutRespondentDto from './put-respondent.dto';

export default class AddGuestRespondentDto extends PutRespondentDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail({ require_tld: false })
  email?: string;
}
