(function (g) {
  g.window = g;
  g.global = g;

  g.process = require('./process');

  // synchronous GAS polyfill
  function setTimeout_(fn, delay = 0) {
    if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
    let args = Array.prototype.slice.call(arguments, 2);
    if (delay) Utilities.sleep(delay);
    fn.apply(null, args);
  }

  g.setTimeout = setTimeout_;
  g.setInterval = setTimeout_;
  g.clearTimeout = function () {};
  g.clearInterval = function () {};

  // uses setTimeout(); can be tricked to use process.nextTick()
  require('setimmediate');

  g.Promise = require('es6-promise').Promise;
  // uses setTimeout(); can be tricked to use process.nextTick()
  // manually: Promise._setScheduler(setTimeout);
  // see https://github.com/stefanpenner/es6-promise/blob/f97e2666e6928745c450752e74213d2438b48b4c/lib/es6-promise/asap.js

  g.Buffer = require('buffer').Buffer;
  g['Buffer.isBuffer'] = require('is-buffer');
  g.URL = require('./url').URL;
  g.fetch = require('./fetch');
})(globalThis);
