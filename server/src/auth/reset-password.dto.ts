import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export default class ResetPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({ require_tld: false })
  email: string;
}
