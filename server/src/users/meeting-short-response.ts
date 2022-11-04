import { PickType } from "@nestjs/swagger";
import MeetingResponse from "src/meetings/meeting-response";

export default class MeetingShortResponse extends PickType(MeetingResponse, [
  'meetingID',
  'name',
  'minStartHour',
  'maxEndHour',
  'tentativeDates',
  'scheduledStartDateTime',
] as const) {}
