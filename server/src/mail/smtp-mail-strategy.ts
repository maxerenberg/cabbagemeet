import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EnvironmentVariables } from '../env.validation';
import type { IMailStrategy, SendParams } from './mail.service';

export default class SMTPMailStrategy implements IMailStrategy {
  private transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | undefined;
  private readonly logger = new Logger(SMTPMailStrategy.name);

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const smtpHost = configService.get('SMTP_HOST', { infer: true });
    const smtpPort = +configService.get('SMTP_PORT', { infer: true });
    const smtpFrom = configService.get('SMTP_FROM', { infer: true });
    if (!(smtpHost && smtpPort && smtpFrom)) {
      throw new Error(
        'SMTP_HOST, SMTP_PORT and SMTP_FROM must all be specified together',
      );
    }
    const smtpUser = configService.get('SMTP_USER', { infer: true });
    const smtpPass = configService.get('SMTP_PASSWORD', { infer: true });
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
    if (process.env.NODE_ENV === 'production') {
      transportOptions.requireTLS = true;
    }
    this.transport = nodemailer.createTransport(transportOptions, {
      from: `CabbageMeet <${smtpFrom}>`,
    });
  }

  async sendNow({ recipient, subject, body }: SendParams): Promise<void> {
    this.logger.debug(`Sending to=${recipient} (subject="${subject}")`);
    await this.transport.sendMail({
      to: recipient,
      subject,
      text: body,
    });
  }
}
