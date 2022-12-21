import { ApiProperty, OmitType } from '@nestjs/swagger';
import MeetingResponse from '../meetings/meeting-response';

export default class MeetingShortResponse extends OmitType(MeetingResponse, [
  'selfRespondentID',
  'respondents',
] as const) {}

export class MeetingsShortResponse {
  @ApiProperty({ type: () => MeetingShortResponse, isArray: true })
  meetings: MeetingShortResponse[];
}
