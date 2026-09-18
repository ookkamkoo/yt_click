'use strict';

const { spawn } = require('child_process');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: false });
    child.once('error', reject);
    // Chromium remains running, so resolving after it starts is intentional.
    setTimeout(resolve, 300);
  });
}

async function openChromiumOnLeft({ url, waitMs = 2000 }) {
  try {
    await run('chromium', ['--new-window', url]);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Chromium was not found. Install it with: sudo apt install chromium');
    throw error;
  }
  await delay(waitMs);
  try {
    // `logo` is the Super/Windows key. This sends Super + Left Arrow on Wayland.
    // Keep Super pressed briefly; some Wayland window managers ignore an
    // immediately-following arrow key while a new window is still focusing.
    await run('wtype', ['-M', 'logo', '-s', '300', '-k', 'Left', '-s', '150', '-m', 'logo']);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('wtype was not found. Install it with: sudo apt install wtype');
    throw new Error(`Could not send the left-window shortcut: ${error.message}`);
  }
}

module.exports = { openChromiumOnLeft };
