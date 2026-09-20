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
  if (config.browser.launch !== undefined) {
    const launch = config.browser.launch;
    if (!launch || !Number.isFinite(launch.x) || !Number.isFinite(launch.y) || !Number.isInteger(launch.waitMs) || launch.waitMs < 0) {
      throw new Error('browser.launch must contain numeric x/y and a non-negative integer waitMs.');
    }
  }
  if (config.browser.useUserProfile !== undefined && typeof config.browser.useUserProfile !== 'boolean') {
    throw new Error('browser.useUserProfile must be true or false.');
  }
  if (config.browser.waitMs !== undefined && (!Number.isInteger(config.browser.waitMs) || config.browser.waitMs < 0)) throw new Error('browser.waitMs must be a non-negative integer.');
  if (!Array.isArray(config.browser.initialVideos) || config.browser.initialVideos.length < 1 || config.browser.initialVideos.length > 4) {
    throw new Error('browser.initialVideos must contain 1 to 4 coordinate objects.');
  }
  for (const [index, point] of config.browser.initialVideos.entries()) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`browser.initialVideos[${index}] must contain numeric x and y.`);
  }
  if (!Number.isInteger(config.browser.initialPageLoadMs) || config.browser.initialPageLoadMs < 0) throw new Error('browser.initialPageLoadMs must be a non-negative integer.');
  const focus = config.browser.focus;
  if (!focus || typeof focus !== 'object' || !Number.isFinite(focus.x) || !Number.isFinite(focus.y)) {
    throw new Error('browser.focus.x and browser.focus.y must be numbers.');
  }
  if (!Number.isInteger(config.browser.focusWaitMs) || config.browser.focusWaitMs < 0) throw new Error('browser.focusWaitMs must be a non-negative integer.');
  if (!Number.isInteger(config.browser.videoCheckMs) || config.browser.videoCheckMs < 0) throw new Error('browser.videoCheckMs must be a non-negative integer.');
  if (!Array.isArray(config.browser.nextVideos) || config.browser.nextVideos.length < 1 || config.browser.nextVideos.length > 4) {
    throw new Error('browser.nextVideos must contain 1 to 4 coordinate objects.');
  }
  for (const [index, point] of config.browser.nextVideos.entries()) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`browser.nextVideos[${index}] must contain numeric x and y.`);
  }
  if (!Number.isInteger(config.browser.nextVideoBufferMs) || config.browser.nextVideoBufferMs < 0) throw new Error('browser.nextVideoBufferMs must be a non-negative integer.');
  const runtime = config.runtime;
  if (!runtime || !Number.isFinite(runtime.minHours) || !Number.isFinite(runtime.maxHours) || runtime.minHours <= 0 || runtime.maxHours < runtime.minHours) {
    throw new Error('runtime.minHours and runtime.maxHours must be positive numbers, with maxHours >= minHours.');
  }
  const startDelay = config.startDelay;
  if (!startDelay || !Number.isFinite(startDelay.minMinutes) || !Number.isFinite(startDelay.maxMinutes) || startDelay.minMinutes < 0 || startDelay.maxMinutes < startDelay.minMinutes) {
    throw new Error('startDelay.minMinutes and startDelay.maxMinutes must be non-negative numbers, with maxMinutes >= minMinutes.');
  }
  return config;
}

function runtimeMilliseconds({ minHours, maxHours }) {
  return Math.round((minHours + Math.random() * (maxHours - minHours)) * 60 * 60 * 1000);
}

function startupDelayMilliseconds({ minMinutes, maxMinutes }) {
  return Math.round((minMinutes + Math.random() * (maxMinutes - minMinutes)) * 60 * 1000);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function bangkokTime(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} Asia/Bangkok`;
}

async function main() {
  const command = process.argv[2];
  if (command === '--help' || command === '-h') {
    console.log('Usage: node app.js');
    console.log('Opens Chromium and places its window on the left side of the Raspberry Pi desktop.');
    return;
  }
  if (command) throw new Error(`Unknown command: ${command}`);
  const config = loadConfig();
  const startDelayMs = startupDelayMilliseconds(config.startDelay);
  const startAt = new Date(Date.now() + startDelayMs);
  console.log(`Start delay: ${(startDelayMs / 60000).toFixed(2)} minute(s). Browser will start at ${bangkokTime(startAt)}.`);
  await delay(startDelayMs);
  console.log(`Start delay completed at ${bangkokTime(new Date())}. Starting Chromium now.`);
  const runtimeMs = runtimeMilliseconds(config.runtime);
  const stopTimer = setTimeout(() => {
    console.log('Maximum runtime reached. Stopping program.');
    process.exit(0);
  }, runtimeMs);
  console.log(`Maximum runtime: ${(runtimeMs / 3600000).toFixed(2)} hour(s). Expected stop: ${bangkokTime(new Date(Date.now() + runtimeMs))}.`);
  const result = await openChromiumOnLeft(config.browser);
  clearTimeout(stopTimer);
  console.log(result.clicked
    ? `Chromium opened; first video clicked. VIDEO DURATION: ${result.duration.formatted} (${result.duration.seconds}s). Next video choice: ${result.nextVideoIndex + 1}.`
    : `Chromium opened, but config.browser.url is not the YouTube home page: ${result.currentUrl}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message || error}`);
  process.exitCode = 1;
});

module.exports = { runtimeMilliseconds, startupDelayMilliseconds };
