import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import CustomJwtModule from '../custom-jwt/custom-jwt.module';
import MeetingsModule from '../meetings/meetings.module';
import UsersModule from '../users/users.module';
import GoogleOAuth2 from './google-oauth2.entity';
import { Oauth2Controller } from './oauth2.controller';
import OAuth2Service from './oauth2.service';
import GoogleCalendarEvents from './google-calendar-events.entity';
import GoogleCalendarCreatedEvent from './google-calendar-created-event.entity';
import MicrosoftOAuth2 from './microsoft-oauth2.entity';

@Module({
  imports: [
    UsersModule,
    MeetingsModule,
    CustomJwtModule,
    TypeOrmModule.forFeature([
      GoogleOAuth2, GoogleCalendarEvents, GoogleCalendarCreatedEvent,
      MicrosoftOAuth2,
    ]),
  ],
  providers: [OAuth2Service],
  exports: [OAuth2Service],
  controllers: [Oauth2Controller],
})
export default class OAuth2Module {}
