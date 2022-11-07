import { PartialType, PickType } from '@nestjs/swagger';
import LocalSignupDto from '../auth/local-signup.dto';

export default class EditUserDto extends PartialType(
  PickType(LocalSignupDto, ['name', 'email', 'subscribe_to_notifications'])
) {}
