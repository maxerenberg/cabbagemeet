import { ApiProperty } from '@nestjs/swagger';

export default class VerifyEmailAddressResponse {
  @ApiProperty()
  mustVerifyEmailAddress: boolean;
}
