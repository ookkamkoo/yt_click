'use strict';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runActions(actions, adb, logger) {
  for (const action of actions) {
    if (action.type === 'tap') {
      await adb.tapScreen(action.x, action.y);
      logger.success(`TAP x=${action.x} y=${action.y} SUCCESS`);
    } else if (action.type === 'swipe') {
      await adb.swipe(action.x1, action.y1, action.x2, action.y2, action.duration);
      logger.success(`SWIPE x1=${action.x1} y1=${action.y1} x2=${action.x2} y2=${action.y2} duration=${action.duration} SUCCESS`);
    } else if (action.type === 'wait') {
      await delay(action.ms);
      logger.info(`WAIT ms=${action.ms} SUCCESS`);
    } else if (action.type === 'text') {
      await adb.inputText(action.value);
      logger.success(`TEXT value=${JSON.stringify(action.value)} SUCCESS`);
    } else if (action.type === 'keyevent') {
      await adb.keyEvent(action.key);
      logger.success(`KEYEVENT key=${action.key} SUCCESS`);
    } else if (action.type === 'repeat') {
      let completed = 0;
      while (action.count === 0 || completed < action.count) {
        completed += 1;
        logger.info(`REPEAT iteration=${completed}${action.count === 0 ? ' (continuous)' : `/${action.count}`}`);
        await runActions(action.actions, adb, logger);
      }
    }
  }
}

module.exports = { runActions };
