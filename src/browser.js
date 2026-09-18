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

function isYouTubeHomePage(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['youtube.com', 'www.youtube.com'].includes(url.hostname) && url.pathname === '/';
  } catch { return false; }
}

async function clickFirstVideo({ x, y, pageLoadMs }) {
  await delay(pageLoadMs);
  try {
    await run('ydotool', ['mousemove', '--absolute', String(x), String(y)]);
    await delay(150);
    await run('ydotool', ['click', '0xC0']);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('ydotool was not found. Install it from Debian trixie-backports.');
    throw new Error(`Could not click the first video. Ensure ydotoold is running: ${error.message}`);
  }
}

async function focusBrowser({ x, y }) {
  try {
    await run('ydotool', ['mousemove', '--absolute', String(x), String(y)]);
    await run('ydotool', ['click', '0xC0']);
    await delay(500);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('ydotool was not found. Install it from Debian trixie-backports.');
    throw new Error(`Could not focus Chromium. Ensure ydotoold is running: ${error.message}`);
  }
}

async function openChromiumOnLeft({ url, waitMs = 2000, focusWaitMs = 2000, firstVideo, focus }) {
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
  // Focus a safe point on Chromium's title/tab bar before further screen actions.
  await focusBrowser(focus);
  await delay(focusWaitMs);
  // The browser is launched with this configured URL. Reading the desktop
  // clipboard over SSH is unreliable because it may contain terminal text.
  if (!isYouTubeHomePage(url)) return { clicked: false, currentUrl: url };
  await clickFirstVideo(firstVideo);
  return { clicked: true, currentUrl: url };
}

module.exports = { openChromiumOnLeft };
