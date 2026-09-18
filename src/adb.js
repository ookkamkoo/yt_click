'use strict';

const { spawn } = require('child_process');

class AdbError extends Error {}

function execute(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('adb', args, { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', (error) => reject(new AdbError(error.code === 'ENOENT' ? 'ADB was not found. Install Android Platform Tools and add adb to PATH.' : `Could not run ADB: ${error.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new AdbError((stderr || stdout || `ADB exited with code ${code}`).trim()));
    });
  });
}

class AdbClient {
  constructor(deviceId = '') { this.deviceId = deviceId || ''; }
  deviceArgs(args) { return this.deviceId ? ['-s', this.deviceId, ...args] : args; }
  async listDevices() { return execute(['devices']); }
  async ensureDeviceReady() {
    const output = await this.listDevices();
    const devices = output.split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
      const [id, state] = line.split(/\s+/); return { id, state };
    });
    if (this.deviceId) {
      const device = devices.find((item) => item.id === this.deviceId);
      if (!device) throw new AdbError(`Device "${this.deviceId}" was not found. Check: adb devices`);
      if (device.state !== 'device') throw new AdbError(`Device "${this.deviceId}" is ${device.state}. Reconnect it or authorize USB debugging.`);
    } else {
      const ready = devices.filter((item) => item.state === 'device');
      if (ready.length === 0) throw new AdbError('No ready Android device found. Connect a device, enable USB debugging, then check: adb devices');
      if (ready.length > 1) throw new AdbError('More than one device is connected. Set deviceId in config.json.');
    }
  }
  tapScreen(x, y) { return execute(this.deviceArgs(['shell', 'input', 'tap', String(x), String(y)])); }
  swipe(x1, y1, x2, y2, duration) { return execute(this.deviceArgs(['shell', 'input', 'swipe', String(x1), String(y1), String(x2), String(y2), String(duration)])); }
  inputText(value) {
    // Android's `input text` represents spaces as %s.
    return execute(this.deviceArgs(['shell', 'input', 'text', value.replace(/ /g, '%s')]));
  }
  keyEvent(key) { return execute(this.deviceArgs(['shell', 'input', 'keyevent', key])); }
  getScreenSize() { return execute(this.deviceArgs(['shell', 'wm', 'size'])); }
}

module.exports = { AdbClient, AdbError };
