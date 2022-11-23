#!/usr/bin/env node
const { SMTPServer } = require('smtp-server');

const HOST = 'localhost';
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
    console.log('DATA:');
    stream.pipe(process.stdout);
    stream.on('end', callback);
  },
  onClose() {
    console.log('CLOSE');
  },
});
server.listen({host: HOST, port: PORT}, () => {
  console.log(`Listening on ${HOST}:${PORT}`);
});
