import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import User from './user.entity';
import UsersService from './users.service';
import MeetingsModule from '../meetings/meetings.module';

@Module({
  imports: [MeetingsModule, TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
  controllers: [UsersController],
})
export default class UsersModule {}
