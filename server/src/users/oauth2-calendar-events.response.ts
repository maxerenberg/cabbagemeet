import { ApiProperty } from '@nestjs/swagger';

class OAuth2CalendarEventsResponseItem {
  @ApiProperty({ example: 'Meeting with Joe' })
  summary: string;

  @ApiProperty({ example: '2022-10-23T10:00:00Z' })
  startDateTime: string;

  @ApiProperty({ example: '2022-10-23T10:30:00Z' })
  endDateTime: string;
}

export default class OAuth2CalendarEventsResponse {
  @ApiProperty({ type: () => OAuth2CalendarEventsResponseItem, isArray: true })
  events: OAuth2CalendarEventsResponseItem[];
}
