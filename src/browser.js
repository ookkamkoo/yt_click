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

function capture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `${command} exited with code ${code}`)));
  });
}

async function copyCurrentUrl() {
  // ydotool key codes: Ctrl=29, L=38, C=46, Escape=1.
  await run('ydotool', ['key', '29:1', '38:1', '38:0', '29:0']);
  await delay(500);
  await run('ydotool', ['key', '29:1', '46:1', '46:0', '29:0']);
  await delay(1000);

  let value = '';
  for (let attempt = 0; attempt < 3 && !value; attempt += 1) {
    try { value = await capture('wl-paste', ['--no-newline']); }
    catch (error) {
      if (!String(error.message).includes('Nothing is copied')) throw error;
      await delay(750);
    }
  }
  await run('ydotool', ['key', '1:1', '1:0']);
  return value;
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

async function openChromiumOnLeft({ url, waitMs = 2000, firstVideo, focus }) {
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
  // Focus a safe point on Chromium's title/tab bar before keyboard shortcuts.
  await focusBrowser(focus);
  const currentUrl = await copyCurrentUrl();
  if (!isYouTubeHomePage(currentUrl)) return { clicked: false, currentUrl };
  await clickFirstVideo(firstVideo);
  return { clicked: true, currentUrl };
}

module.exports = { openChromiumOnLeft };
