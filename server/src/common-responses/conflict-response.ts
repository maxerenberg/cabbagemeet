import { ApiProperty } from '@nestjs/swagger';

export default class ConflictResponse {
  @ApiProperty({ example: 410 })
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty({ example: 'Conflict' })
  error: string;
}
