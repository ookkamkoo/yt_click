'use strict';

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isNumber(value) { return typeof value === 'number' && Number.isFinite(value); }
function requireNumber(object, key, label, errors) {
  if (!isNumber(object[key])) errors.push(`${label}.${key} must be a finite number.`);
}

function validateAction(action, label, errors) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    errors.push(`${label} must be an object.`); return;
  }
  if (!['tap', 'swipe', 'wait', 'text', 'keyevent', 'repeat'].includes(action.type)) {
    errors.push(`${label}.type must be tap, swipe, wait, text, keyevent, or repeat.`); return;
  }
  if (action.type === 'tap') ['x', 'y'].forEach((key) => requireNumber(action, key, label, errors));
  if (action.type === 'swipe') ['x1', 'y1', 'x2', 'y2', 'duration'].forEach((key) => requireNumber(action, key, label, errors));
  if (action.type === 'swipe' && isNumber(action.duration) && action.duration < 0) errors.push(`${label}.duration must not be negative.`);
  if (action.type === 'wait') {
    requireNumber(action, 'ms', label, errors);
    if (isNumber(action.ms) && action.ms < 0) errors.push(`${label}.ms must not be negative.`);
  }
  if (action.type === 'text' && (typeof action.value !== 'string' || action.value.length === 0)) errors.push(`${label}.value must be a non-empty string.`);
  if (action.type === 'keyevent' && (typeof action.key !== 'string' || action.key.length === 0)) errors.push(`${label}.key must be a non-empty string, for example ENTER.`);
  if (action.type === 'repeat') {
    if (!Number.isInteger(action.count) || action.count < 0) errors.push(`${label}.count must be an integer; use 0 for continuous looping.`);
    if (!Array.isArray(action.actions) || action.actions.length === 0) errors.push(`${label}.actions must be a non-empty array.`);
    else action.actions.forEach((item, index) => validateAction(item, `${label}.actions[${index}]`, errors));
  }
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['config.json must contain a JSON object.'];
  if ('deviceId' in config && typeof config.deviceId !== 'string') errors.push('deviceId must be a string.');
  if (!Array.isArray(config.schedules) || config.schedules.length === 0) errors.push('schedules must be a non-empty array.');
  else config.schedules.forEach((schedule, index) => {
    const label = `schedules[${index}]`;
    if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) { errors.push(`${label} must be an object.`); return; }
    if (typeof schedule.time !== 'string' || !timePattern.test(schedule.time)) errors.push(`${label}.time must use HH:mm (00:00-23:59).`);
    if (schedule.actions !== undefined) {
      if (!Array.isArray(schedule.actions) || schedule.actions.length === 0) errors.push(`${label}.actions must be a non-empty array.`);
      else schedule.actions.forEach((action, actionIndex) => validateAction(action, `${label}.actions[${actionIndex}]`, errors));
    } else {
      requireNumber(schedule, 'x', label, errors);
      requireNumber(schedule, 'y', label, errors);
    }
  });
  return errors;
}

function loadConfig() {
  let config;
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (error) { throw new Error(`Cannot read config.json: ${error.message}`); }
  const errors = validateConfig(config);
  if (errors.length) throw new Error(`Invalid config.json:\n- ${errors.join('\n- ')}`);
  return {
    deviceId: config.deviceId || '',
    schedules: config.schedules.map((schedule) => ({
      ...schedule,
      actions: schedule.actions || [{ type: 'tap', x: schedule.x, y: schedule.y }]
    }))
  };
}

module.exports = { loadConfig, validateConfig };
