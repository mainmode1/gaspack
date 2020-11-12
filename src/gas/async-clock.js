// see https://github.com/sinonjs/fake-timers
const FakeTimers = require('@sinonjs/fake-timers').withGlobal(globalThis);

// https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
// helpful https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/

const processPresent = typeof process !== 'undefined' && process;
const nextTickPresent = processPresent && typeof process.nextTick === 'function';
const promisePresent = typeof Promise !== 'undefined';

const clock = FakeTimers.install({
  now: processPresent ? process.start : Date.now(),
  toFake: [
    'setTimeout',
    'clearTimeout',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    // 'Date', // keep current system time
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'hrtime',
    'nextTick', // must be explicit
  ],
});

if (promisePresent && nextTickPresent) Promise._setScheduler(process.nextTick);

if (processPresent) {
  process.clock = clock;
  let lastTick = clock.now;

  process.tick = function () {
    const systemNow = Date.now(),
      diff = systemNow - lastTick;
    lastTick = systemNow;
    clock.tick(diff);
  };

  process.exit = function (code) {
    process.exitCode = code ? code : process.exitCode || 0;
    do {
      // clock.runMicrotasks();
      if (!clock.countTimers()) break;
      process.tick();
    } while (Date.now() - process.start < 5 * 60 * 1000);
    // clock.runAll();
  };
}

module.exports = clock;
