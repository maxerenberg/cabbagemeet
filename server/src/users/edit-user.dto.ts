import { PartialType, PickType } from '@nestjs/swagger';
import LocalSignupDto from '../auth/local-signup.dto';

export default class EditUserDto extends PartialType(
  PickType(LocalSignupDto, ['name', 'subscribe_to_notifications'])
) {}
