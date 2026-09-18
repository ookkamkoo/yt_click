'use strict';

const { loadConfig } = require('./src/config');
const { AdbClient, AdbError } = require('./src/adb');
const { runActions } = require('./src/actions');
const { Scheduler } = require('./src/scheduler');
const logger = require('./src/logger');

function usage() {
  console.log('Usage:');
  console.log('  node app.js                 Start scheduled actions');
  console.log('  node app.js tap <x> <y>     Tap immediately');
  console.log('  node app.js size            Show screen size');
  console.log('  node app.js devices         Show connected ADB devices');
}

function parseCoordinate(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${name} must be a number.`);
  return number;
}

async function createReadyAdb() {
  const config = loadConfig();
  const adb = new AdbClient(config.deviceId);
  await adb.ensureDeviceReady();
  return { adb, config };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === 'help' || command === '--help' || command === '-h') return usage();
  if (command === 'devices') {
    const adb = new AdbClient();
    const output = await adb.listDevices();
    console.log(output || 'No devices found.');
    return;
  }

  const { adb, config } = await createReadyAdb();
  if (command === 'tap') {
    if (args.length !== 2) throw new Error('Usage: node app.js tap <x> <y>');
    const x = parseCoordinate(args[0], 'x');
    const y = parseCoordinate(args[1], 'y');
    await adb.tapScreen(x, y);
    logger.success(`TAP x=${x} y=${y} SUCCESS`);
    return;
  }
  if (command === 'size') {
    console.log(await adb.getScreenSize());
    return;
  }
  if (command) throw new Error(`Unknown command: ${command}`);

  const scheduler = new Scheduler(config.schedules, async (schedule) => {
    await runActions(schedule.actions, adb, logger);
  }, logger);
  scheduler.start();
  logger.info(`Scheduler started (${config.schedules.length} schedule(s), timezone Asia/Bangkok). Press Ctrl+C to stop.`);

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    scheduler.stop();
    logger.info('Scheduler stopped. Goodbye.');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  const message = error instanceof AdbError ? error.message : error.message || String(error);
  logger.error(message);
  process.exitCode = 1;
});
