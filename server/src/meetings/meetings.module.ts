import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import MeetingRespondent from './meeting-respondent.entity';
import Meeting from './meeting.entity';
import { MeetingsController } from './meetings.controller';
import MeetingsService from './meetings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, MeetingRespondent])],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export default class MeetingsModule {}
