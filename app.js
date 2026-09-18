'use strict';

const fs = require('fs');
const path = require('path');
const { openChromiumOnLeft } = require('./src/browser');

function loadConfig() {
  const file = path.join(__dirname, 'config.json');
  let config;
  try { config = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`Cannot read config.json: ${error.message}`); }
  if (!config.browser || typeof config.browser !== 'object') throw new Error('config.json.browser is required.');
  if (typeof config.browser.url !== 'string' || !config.browser.url.startsWith('http')) throw new Error('browser.url must be a valid http/https URL.');
  if (config.browser.waitMs !== undefined && (!Number.isInteger(config.browser.waitMs) || config.browser.waitMs < 0)) throw new Error('browser.waitMs must be a non-negative integer.');
  const firstVideo = config.browser.firstVideo;
  if (!firstVideo || typeof firstVideo !== 'object') throw new Error('browser.firstVideo is required.');
  for (const key of ['x', 'y', 'pageLoadMs']) {
    if (!Number.isFinite(firstVideo[key]) || firstVideo[key] < 0) throw new Error(`browser.firstVideo.${key} must be a non-negative number.`);
  }
  return config.browser;
}

async function main() {
  const command = process.argv[2];
  if (command === '--help' || command === '-h') {
    console.log('Usage: node app.js');
    console.log('Opens Chromium and places its window on the left side of the Raspberry Pi desktop.');
    return;
  }
  if (command) throw new Error(`Unknown command: ${command}`);
  const result = await openChromiumOnLeft(loadConfig());
  console.log(result.clicked
    ? 'Chromium opened; YouTube URL verified and first video clicked.'
    : `Chromium opened, but the current URL is not the YouTube home page: ${result.currentUrl || '(unable to read URL)'}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message || error}`);
  process.exitCode = 1;
});
