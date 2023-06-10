import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import ConfigService from '../config/config.service';
import type { IMailStrategy, SendParams } from './mail.service';

export default class SMTPMailStrategy implements IMailStrategy {
  private transport:
    | nodemailer.Transporter<SMTPTransport.SentMessageInfo>
    | undefined;
  private readonly logger = new Logger(SMTPMailStrategy.name);

  constructor(configService: ConfigService) {
    const smtpHost = configService.get('SMTP_HOST');
    const smtpPort = +configService.get('SMTP_PORT');
    const smtpFrom = configService.get('SMTP_FROM');
    if (!(smtpHost && smtpPort && smtpFrom)) {
      throw new Error(
        'SMTP_HOST, SMTP_PORT and SMTP_FROM must all be specified together',
      );
    }
    const smtpUser = configService.get('SMTP_USER');
    const smtpPass = configService.get('SMTP_PASSWORD');
    const transportOptions: SMTPTransport.Options = {
      port: smtpPort,
      host: smtpHost,
      connectionTimeout: 10,
    };
    if (smtpUser && smtpPass) {
      transportOptions.auth = {
        user: smtpUser,
        pass: smtpPass,
      };
    }
    if (smtpPort === 465) {
      transportOptions.secure = true;
    }
    if (
      process.env.NODE_ENV === 'production' &&
      (smtpPort === 25 || smtpPort === 587)
    ) {
      transportOptions.requireTLS = true;
    }
    const messageDefaults: SMTPTransport.Options = {
      from: { name: 'CabbageMeet', address: smtpFrom },
    };
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'
    ) {
      messageDefaults.textEncoding = 'base64';
    }
    this.transport = nodemailer.createTransport(
      transportOptions,
      messageDefaults,
    );
  }

  async sendNow({ recipient: { address, name }, subject, body }: SendParams) {
    this.logger.debug(`Sending to=${address} (subject="${subject}")`);
    await this.transport.sendMail({
      to: { address, name },
      subject,
      text: body,
    });
  }
}
