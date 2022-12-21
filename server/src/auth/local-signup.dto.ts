import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export default class LocalSignupDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({ require_tld: false })
  email: string;

  @ApiProperty({ example: 'super_secret_password' })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  subscribe_to_notifications?: boolean;
}
