'use strict';

function bangkokClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).filter(({ type }) => type !== 'literal');
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return { time: `${value.hour}:${value.minute}`, date: `${value.year}-${value.month}-${value.day}` };
}

class Scheduler {
  constructor(schedules, executeSchedule, logger) {
    this.schedules = schedules;
    this.executeSchedule = executeSchedule;
    this.logger = logger;
    this.completed = new Set();
    this.timer = null;
  }
  async tick() {
    const clock = bangkokClock();
    for (let index = 0; index < this.schedules.length; index += 1) {
      const schedule = this.schedules[index];
      const key = `${clock.date}:${clock.time}:${index}`;
      if (schedule.time !== clock.time || this.completed.has(key)) continue;
      this.completed.add(key); // Mark before execution, so an interval can never duplicate it.
      try { await this.executeSchedule(schedule); }
      catch (error) { this.logger.error(`SCHEDULE ${schedule.time} FAILED: ${error.message || error}`); }
    }
    // Keep only today's entries; this bounds memory while retaining the no-repeat guarantee.
    for (const key of this.completed) if (!key.startsWith(`${clock.date}:`)) this.completed.delete(key);
  }
  start() { this.tick(); this.timer = setInterval(() => this.tick(), 1000); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

module.exports = { Scheduler, bangkokClock };
