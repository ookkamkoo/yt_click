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
  for (let seconds = 2; seconds > 0; seconds -= 1) {
    console.log(`Select the target point in ${seconds}...`);
    await delay(1000);
  }
  console.log('Click the target point once. Press Escape to cancel.');
  const output = await selectPoint();
  const match = output.match(/^(-?\d+),(-?\d+)/);
  if (!match) throw new Error(`Could not read coordinates: ${output}`);
  const [, x, y] = match;
  console.log(`POSITION x=${x} y=${y}`);
  console.log(`Paste into config.json: { "x": ${x}, "y": ${y} }`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message || error}`);
  process.exitCode = 1;
});
