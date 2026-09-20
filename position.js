'use strict';

const { spawn } = require('child_process');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function selectPoint() {
  return new Promise((resolve, reject) => {
    const child = spawn('slurp', ['-p'], { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', (error) => {
      if (error.code === 'ENOENT') reject(new Error('slurp was not found. Install it with: sudo apt install slurp'));
      else reject(error);
    });
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || 'Point selection cancelled.')));
  });
}

async function main() {
  const count = Number(process.argv[2] || 1);
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new Error('Usage: node position.js [1-4]');
  }
  const positions = [];
  for (let index = 0; index < count; index += 1) {
    for (let seconds = 2; seconds > 0; seconds -= 1) {
      console.log(`Select point ${index + 1}/${count} in ${seconds}...`);
      await delay(1000);
    }
    console.log(`Click target point ${index + 1}/${count}. Press Escape to cancel.`);
    const output = await selectPoint();
    const match = output.match(/^(-?\d+),(-?\d+)/);
    if (!match) throw new Error(`Could not read coordinates: ${output}`);
    const [, x, y] = match;
    positions.push({ x: Number(x), y: Number(y) });
    console.log(`POSITION ${index + 1}: x=${x} y=${y}`);
  }
  if (count === 1) console.log(`Paste into config.json: ${JSON.stringify(positions[0])}`);
  else console.log(`Paste into config.json initialVideos: ${JSON.stringify(positions)}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message || error}`);
  process.exitCode = 1;
});
