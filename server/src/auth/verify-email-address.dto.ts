import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import LocalSignupDto from "./local-signup.dto";

export class VerifyEmailAddressEntity extends LocalSignupDto {
  // Unix epoch timestamp
  // If the current time is greater than this number, the request is invalid
  @IsNumber()
  exp: number;
}

export default class VerifyEmailAddressDto {
  // encrypted JSON-encoded VerifyEmailAddressEntity
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  encrypted_entity: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  iv: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  salt: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tag: string;
}
