import { ApiProperty } from '@nestjs/swagger';

export default class CustomRedirectResponse {
  @ApiProperty({
    description: 'The URL for an OAuth2 consent page',
  })
  redirect: string;
}
