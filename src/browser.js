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

async function copyVideoUrl() {
  // The video click leaves Chromium focused. Select/copy its address bar.
  await run('ydotool', ['key', '29:1', '38:1', '38:0', '29:0']); // Ctrl+L
  await delay(400);
  await run('ydotool', ['key', '29:1', '46:1', '46:0', '29:0']); // Ctrl+C
  await delay(900);
  const url = await capture('wl-paste', ['--no-newline']);
  await run('ydotool', ['key', '1:1', '1:0']); // Escape
  if (!/^https:\/\/(www\.)?youtube\.com\/(watch|shorts)\b/.test(url)) {
    throw new Error(`Could not read a YouTube video URL. Clipboard contains: ${url || '(empty)'}`);
  }
  return url;
}

function formatDuration(seconds) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':');
}

async function getVideoDuration(url) {
  let output;
  try {
    output = await capture('yt-dlp', ['--no-download', '--no-playlist', '--print', '%(duration)s', url]);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('yt-dlp was not found. Install it with: sudo apt -t trixie-backports install yt-dlp');
    throw new Error(`Could not read video duration: ${error.message}`);
  }
  const seconds = Number(output.split(/\r?\n/).at(-1));
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error(`Video duration is unavailable: ${output || '(empty)'}`);
  return { seconds: Math.round(seconds), formatted: formatDuration(seconds) };
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

async function openChromiumOnLeft({ url, waitMs = 2000, focusWaitMs = 2000, videoCheckMs = 5000, firstVideo, focus }) {
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
  await delay(videoCheckMs);
  const videoUrl = await copyVideoUrl();
  const duration = await getVideoDuration(videoUrl);
  return { clicked: true, currentUrl: url, videoUrl, duration };
}

module.exports = { openChromiumOnLeft };
