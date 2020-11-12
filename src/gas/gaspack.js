(function (g) {
  g.window = g;
  g.global = g;

  g.process = require('./process');

  if ({}.toString.call(process) === '[object process]') {
    console.warn('gaspack: process is node-mocked');
  }

  // synchronous GAS polyfill
  function setTimeoutSync(fn, delay = 0) {
    if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
    let args = Array.prototype.slice.call(arguments, 2);
    if (delay) Utilities.sleep(delay);
    fn.apply(null, args);
  }
  g.setTimeout = g.setInterval = setTimeoutSync;
  g.clearTimeout = g.clearInterval = function () {};

  // uses setTimeout(); can be tricked to use process.nextTick() by
  // process[Symbol.toStringTag] = 'process'
  // see https://github.com/browserify/timers-browserify
  require('setimmediate');

  // Promise uses setTimeout(); can be tricked to use process.nextTick() by:
  // process[Symbol.toStringTag] = 'process'
  // ... or manually by: Promise._setScheduler(setTimeout);
  // see https://github.com/stefanpenner/es6-promise/blob/master/lib/es6-promise/asap.js
  g.Promise = require('es6-promise').Promise;

  //TODO make optional?
  require('./async-clock'); // process.clock, monkey patch process.exit() & .tick()

  g.Buffer = require('buffer').Buffer;
  g['Buffer.isBuffer'] = require('is-buffer');
  g.URL = require('./url').URL;
  g.fetch = require('./fetch');
})(globalThis);
