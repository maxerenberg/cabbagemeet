import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export default class LinkExternalCalendarDto {
  @ApiProperty({
    description: (
      'The URL to which the client should be redirected after the OAuth2'
      + ' consent has been granted'
    ),
    example: 'http://localhost:3001/me/settings'
  })
  @IsString()
  post_redirect: string;
}
