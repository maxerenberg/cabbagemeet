import { ApiProperty } from '@nestjs/swagger';

// Make sure to keep this in sync with oauth2-common.ts
export default class ServerInfoResponse {
  @ApiProperty()
  googleOAuth2IsSupported: boolean;

  @ApiProperty()
  microsoftOAuth2IsSupported: boolean;
}
