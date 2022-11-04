import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export default class LocalLoginDto {
  @ApiProperty({example: 'john@example.com'})
  @IsEmail({ require_tld: false })
  email: string;

  @ApiProperty({example: 'super_secret_password'})
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;
}
