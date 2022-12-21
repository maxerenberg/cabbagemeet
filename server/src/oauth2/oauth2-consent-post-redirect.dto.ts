import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export default class OAuth2ConsentPostRedirectDto {
  @ApiProperty({
    description:
      'The URL to which the client should be redirected after the OAuth2' +
      ' consent has been granted',
    example: 'http://localhost:3001/me/settings',
  })
  @IsString()
  @IsNotEmpty()
  post_redirect: string;

  @ApiProperty({
    description:
      'A randomly generated value which will be returned to the client' +
      ' after the OAuth2 consent has been granted',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  nonce?: string;
}
