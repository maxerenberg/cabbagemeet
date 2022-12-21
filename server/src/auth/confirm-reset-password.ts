import { PickType } from '@nestjs/swagger';
import LocalSignupDto from './local-signup.dto';

export default class ConfirmResetPasswordDto extends PickType(LocalSignupDto, [
  'password',
]) {}
