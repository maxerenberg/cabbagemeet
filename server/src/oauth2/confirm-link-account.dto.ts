import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export default class ConfirmLinkAccountDto {
  @ApiProperty()
  @IsString()
  encrypted_entity: string;

  @ApiProperty()
  @IsString()
  iv: string;

  @ApiProperty()
  @IsString()
  salt: string;
}
