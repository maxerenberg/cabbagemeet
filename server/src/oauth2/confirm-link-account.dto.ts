import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export default class ConfirmLinkAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  encrypted_entity: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  iv: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  salt: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tag: string;
}
