import { Module } from '@nestjs/common';
import MailService from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export default class MailModule {}
