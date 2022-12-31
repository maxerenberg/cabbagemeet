#!/usr/bin/env node
const { decode: quotedPrintableDecode } = require('quoted-printable');
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
      console.log('DATA:');
      console.log(chunks.map(chunk => quotedPrintableDecode(chunk.toString())).join(''));
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
