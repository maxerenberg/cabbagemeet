import { ApiProperty } from "@nestjs/swagger";

export default class ForbiddenResponse {
  @ApiProperty({example: 403})
  statusCode: number;

  @ApiProperty({example: 'Forbidden'})
  message: string;
}
