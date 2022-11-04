import { PartialType } from '@nestjs/swagger';
import CreateMeetingDto from './create-meeting.dto';

export default class EditMeetingDto extends PartialType(CreateMeetingDto) {}
