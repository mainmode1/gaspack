globalThis.window = globalThis.global = globalThis;

globalThis.process = require('./process');

// synchronous GAS polyfill
globalThis.setTimeout = globalThis.setInterval = function setTimeout(fn, delay = 0) {
  if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
  let args = Array.prototype.slice.call(arguments, 2);
  if (delay) Utilities.sleep(delay);
  fn.apply(null, args);
};
globalThis.clearTimeout = globalThis.clearInterval = function () {};

// uses setTimeout(); can be tricked to use process.nextTick()
require('setimmediate');

// TODO https://github.com/ysmood/yaku ???
globalThis.Promise = require('es6-promise').Promise;
// uses setTimeout(); can be tricked to use process.nextTick()
// manually: Promise._setScheduler(setTimeout);
// see https://github.com/stefanpenner/es6-promise/blob/f97e2666e6928745c450752e74213d2438b48b4c/lib/es6-promise/asap.js

globalThis.Buffer = require('buffer').Buffer;
globalThis['Buffer.isBuffer'] = require('is-buffer');

globalThis.URL = require('./url').URL;

globalThis.fetch = require('./fetch');
