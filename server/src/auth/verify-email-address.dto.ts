import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";
import LocalSignupDto from "./local-signup.dto";

class EmailAddressInfo {
  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code: string;
}

export default class VerifyEmailAddressDto extends IntersectionType(
  LocalSignupDto, EmailAddressInfo
) {}
