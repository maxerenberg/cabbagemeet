import { ApiProperty } from '@nestjs/swagger';

export default class NotFoundResponse {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not found' })
  message: string;
}
