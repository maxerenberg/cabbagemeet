import { ApiProperty } from "@nestjs/swagger";

export default class BadRequestResponse {
  @ApiProperty({example: 400})
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty({example: 'Bad Request'})
  error: string;
}
