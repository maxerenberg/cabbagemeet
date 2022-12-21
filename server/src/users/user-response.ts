import { ApiProperty } from '@nestjs/swagger';

export default class UserResponse {
  @ApiProperty({ example: 1 })
  userID: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty()
  isSubscribedToNotifications: boolean;

  @ApiProperty()
  hasLinkedGoogleAccount: boolean;

  @ApiProperty()
  hasLinkedMicrosoftAccount: boolean;
}

export class UserResponseWithToken extends UserResponse {
  @ApiProperty({
    description:
      'A bearer token to be used in the Authorization header for future requests',
  })
  token: string;
}
