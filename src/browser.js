'use strict';

const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const REMOTE_DEBUGGING_PORT = 9222;
const CHROMIUM_PROFILE_DIR = path.join(os.tmpdir(), 'yt-click-chromium-profile');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: false });
    child.once('error', reject);
    // Chromium remains running, so resolving after it starts is intentional.
    setTimeout(resolve, 300);
  });
}

function runAndWait(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (data) => { stderr += data; });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
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

function remoteDebuggingTargets() {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port: REMOTE_DEBUGGING_PORT, path: '/json/list', timeout: 2000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error(`DevTools returned HTTP ${response.statusCode}`));
        try { resolve(JSON.parse(body)); }
        catch (error) { reject(new Error(`DevTools returned invalid JSON: ${error.message}`)); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('DevTools connection timed out')));
    request.on('error', reject);
  });
}

async function currentVideoUrl() {
  let targets;
  try {
    targets = await remoteDebuggingTargets();
  } catch (error) {
    throw new Error(`Could not read Chromium's current tab. Ensure port ${REMOTE_DEBUGGING_PORT} is available: ${error.message}`);
  }
  const target = targets.find(({ type, url }) => type === 'page' && /^https:\/\/(www\.)?youtube\.com\/(watch|shorts)\b/.test(url));
  if (!target) throw new Error('Chromium has not navigated to a YouTube video yet. Check the configured video coordinates.');
  return target.url;
}

async function currentVideoUrlFromClipboard(focus, scale) {
  try {
    await focusBrowser(focus, scale);
    await delay(300);
    await runAndWait('wtype', ['-M', 'ctrl', '-k', 'l', '-m', 'ctrl']);
    await runAndWait('wtype', ['-M', 'ctrl', '-k', 'c', '-m', 'ctrl']);
    await delay(200);
    const clipboard = await capture('wl-paste', ['--no-newline']);
    await runAndWait('wtype', ['-k', 'Escape']);
    if (!/^https:\/\/(www\.)?youtube\.com\/(watch|shorts)\b/.test(clipboard)) {
      throw new Error(`Could not read a YouTube video URL. Clipboard contains: ${clipboard || '(empty)'}`);
    }
    return clipboard;
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('wl-paste was not found. Install it with: sudo apt install wl-clipboard');
    throw error;
  }
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

function scaledPoint({ x, y }, scale) {
  return { x: Math.round(x * scale), y: Math.round(y * scale) };
}

async function clickPoint(point, scale = 1) {
  const { x, y } = scaledPoint(point, scale);
  await runAndWait('ydotool', ['mousemove', '--absolute', String(x), String(y)]);
  await delay(150);
  await runAndWait('ydotool', ['click', '0xC0']);
}

async function clickInitialVideo(initialVideos, initialPageLoadMs, scale) {
  await delay(initialPageLoadMs);
  const initialVideoIndex = Math.floor(Math.random() * initialVideos.length);
  const point = initialVideos[initialVideoIndex];
  console.log(`Initial video choice: ${initialVideoIndex + 1} at x=${point.x}, y=${point.y}.`);
  await clickPoint(point, scale);
}

async function focusBrowser(point, scale = 1) {
  const { x, y } = scaledPoint(point, scale);
  try {
    await runAndWait('ydotool', ['mousemove', '--absolute', String(x), String(y)]);
    await runAndWait('ydotool', ['click', '0xC0']);
    await delay(500);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('ydotool was not found. Install it from Debian trixie-backports.');
    throw new Error(`Could not focus Chromium. Ensure ydotoold is running: ${error.message}`);
  }
}

async function navigateToUrl(url) {
  await runAndWait('wtype', ['-M', 'ctrl', '-k', 'l', '-m', 'ctrl']);
  await runAndWait('wtype', [url]);
  await runAndWait('wtype', ['-k', 'Return']);
}

async function scrollToNextVideos(pages, focus, scale) {
  if (focus) {
    await clickPoint(focus, scale);
    await delay(300);
  }
  for (let page = 0; page < pages; page += 1) {
    await runAndWait('ydotool', ['key', '109:1', '109:0']); // Page Down
    await delay(1000);
  }
}

async function openChromiumOnLeft({ url, launch, useUserProfile = false, ydotoolCoordinateScale = 1, waitMs = 2000, focusWaitMs = 2000, videoCheckMs = 5000, initialVideos, initialPageLoadMs = 20000, nextVideos, nextVideoBufferMs = 3000, nextVideoScrollPages = 1, scrollFocus, focus }) {
  if (useUserProfile) {
    try {
      await run('chromium', ['--new-window', url]);
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('Chromium was not found. Install it with: sudo apt install chromium');
      throw error;
    }
    await delay(waitMs);
  } else if (launch) {
    await clickPoint(launch, ydotoolCoordinateScale);
    await delay(launch.waitMs);
  } else {
    try {
      // A dedicated profile makes sure Chromium starts a process with DevTools
      // enabled instead of forwarding this request to an existing browser.
      await run('chromium', [
        `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
        `--user-data-dir=${CHROMIUM_PROFILE_DIR}`,
        '--new-window',
        url
      ]);
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('Chromium was not found. Install it with: sudo apt install chromium');
      throw error;
    }
    await delay(waitMs);
  }
  try {
    // `logo` is the Super/Windows key. This sends Super + Left Arrow on Wayland.
    // Keep Super pressed briefly; some Wayland window managers ignore an
    // immediately-following arrow key while a new window is still focusing.
    await runAndWait('wtype', ['-M', 'logo', '-s', '300', '-k', 'Left', '-s', '150', '-m', 'logo']);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('wtype was not found. Install it with: sudo apt install wtype');
    throw new Error(`Could not send the left-window shortcut: ${error.message}`);
  }
  // Focus a safe point on Chromium's title/tab bar before further screen actions.
  await focusBrowser(focus, ydotoolCoordinateScale);
  await delay(focusWaitMs);
  if (!useUserProfile) {
    await navigateToUrl(url);
    await delay(focusWaitMs);
  }
  if (!isYouTubeHomePage(url)) return { clicked: false, currentUrl: url };
  await clickInitialVideo(initialVideos, initialPageLoadMs, ydotoolCoordinateScale);
  let videoNumber = 1;
  while (true) {
    await delay(videoCheckMs);
    const videoUrl = (launch || useUserProfile) ? await currentVideoUrlFromClipboard(focus, ydotoolCoordinateScale) : await currentVideoUrl();
    const duration = await getVideoDuration(videoUrl);
    const nextVideoIndex = Math.floor(Math.random() * nextVideos.length);
    const totalWaitMs = duration.seconds * 1000 + nextVideoBufferMs;
    console.log(`Video #${videoNumber}: ${duration.formatted} (${duration.seconds}s). Waiting ${(totalWaitMs / 1000).toFixed(0)} seconds; next choice: ${nextVideoIndex + 1}.`);
    await delay(totalWaitMs);
    await scrollToNextVideos(nextVideoScrollPages, scrollFocus, ydotoolCoordinateScale);
    await clickPoint(nextVideos[nextVideoIndex], ydotoolCoordinateScale);
    videoNumber += 1;
  }
}

module.exports = { openChromiumOnLeft };
