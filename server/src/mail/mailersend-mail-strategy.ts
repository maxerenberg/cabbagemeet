import { Logger } from '@nestjs/common';
import { request } from 'undici';
import ConfigService from '../config/config.service';
import { assert } from '../misc.utils';
import type { IMailStrategy, SendParams } from './mail.service';

// See https://developers.mailersend.com/api/v1/email.html
const EMAIL_API_URL = 'https://api.mailersend.com/v1/email';

export default class MailerSendMailStrategy implements IMailStrategy {
  private readonly apiKey: string;
  private readonly smtpFrom: string;
  private readonly logger = new Logger(MailerSendMailStrategy.name);

  constructor(configService: ConfigService) {
    this.apiKey = configService.get('MAILERSEND_API_KEY');
    this.smtpFrom = configService.get('SMTP_FROM');
    assert(this.smtpFrom, 'SMTP_FROM must be set');
  }

  async sendNow({ recipient: {address, name}, subject, body }: SendParams) {
    const requestBody = {
      from: {
        email: this.smtpFrom,
        name: 'CabbageMeet',
      },
      to: [
        {
          email: address,
          name,
        },
      ],
      subject,
      text: body,
    };
    this.logger.debug(`Sending to=${address} (subject="${subject}")`);
    const response = await request(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (response.statusCode !== 202) {
      this.logger.warn('Status code: ' + response.statusCode);
      this.logger.warn(response.headers);
      this.logger.warn(await response.body.text());
    } else {
      this.logger.debug('Status code: ' + response.statusCode);
      const { headers } = response;
      this.logger.debug(headers);
      const contentType = Array.isArray(headers['content-type']) ? headers['content-type'][0] : headers['content-type'];
      if (contentType?.startsWith('application/json')) {
        this.logger.debug(await response.body.json());
      }
    }
  }
}
