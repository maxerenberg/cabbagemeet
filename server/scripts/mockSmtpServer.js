#!/usr/bin/env node
const { SMTPServer } = require('smtp-server');

const HOST = '127.0.0.1';
const PORT = 8025;

const server = new SMTPServer({
  secure: false,
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  disableReverseLookup: true,
  onMailFrom(address, session, callback) {
    console.log('MAIL FROM: ' + address.address);
    return callback();
  },
  onRcptTo(address, session, callback) {
    console.log('RCPT TO: ' + address.address);
    return callback();
  },
  onData(stream, session, callback) {
    const chunks = [];
    stream.on('data', data => {
      chunks.push(data);
    });
    stream.on('end', () => {
      const lines = chunks
        .map(chunk => chunk.toString())
        .join('')
        .split('\r\n');
      let contentTransferEncoding;
      let headers;
      let body;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('Subject: ')) {
          let subject = lines[i].slice('Subject: '.length);
          if (subject.startsWith('=?UTF-8?B?') && subject.endsWith('?=')) {
            // https://www.ietf.org/rfc/rfc2047.txt
            subject = Buffer.from(
              subject.slice('=?UTF-8?B?'.length, subject.length - '?='.length),
              'base64',
            ).toString();
            if (lines[i + 1].startsWith(' =?UTF-8?B?')) {
              // wraps around multiple lines
              subject += Buffer.from(
                lines[i + 1].slice(' =?UTF-8?B?'.length, lines[i + 1].length - '?='.length),
                'base64',
              ).toString();
              lines.splice(i + 1, 1);
            }
            lines[i] = 'Subject: ' + subject;
          }
        } else if (lines[i].startsWith('Content-Transfer-Encoding: ')) {
          contentTransferEncoding = lines[i].slice('Content-Transfer-Encoding: '.length);
        } else if (lines[i].length === 0) {
          headers = lines.slice(0, i + 1).join('\n');
          if (contentTransferEncoding === 'base64') {
            body = Buffer.from(lines.slice(i + 1).join(), 'base64').toString();
          } else {
            body = lines.slice(i + 1).join('\n');
          }
          break;
        }
      }
      console.log('DATA:');
      console.log(headers + '\n' + body);
      callback();
    });
  },
  onClose() {
    console.log('CLOSE');
  },
});
server.listen({host: HOST, port: PORT}, () => {
  console.log(`Listening on ${HOST}:${PORT}`);
});
