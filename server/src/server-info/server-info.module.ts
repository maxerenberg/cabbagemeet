import { Module } from '@nestjs/common';
import OAuth2Module from 'src/oauth2/oauth2.module';
import ServerInfoController from './server-info.controller';

@Module({
  imports: [OAuth2Module],
  controllers: [ServerInfoController],
})
export default class ServerInfoModule {}
