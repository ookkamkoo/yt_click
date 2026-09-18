'use strict';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function timestamp() {
  const parts = Object.fromEntries(formatter.formatToParts(new Date())
    .filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function write(level, message) {
  const line = `[${timestamp()}] ${message}`;
  (level === 'ERROR' ? console.error : console.log)(line);
}

module.exports = { info: (message) => write('INFO', message), success: (message) => write('INFO', message), error: (message) => write('ERROR', message) };
