(function (g) {
  g.window = g.global = g;

  g.process = require('./process');

  g.setTimeout = g.setInterval = function (fn, delay = 0) {
    if ('function' !== typeof fn) throw Error('first parameter must be a function');
    let args = Array.prototype.slice.call(arguments, 2);
    Utilities.sleep(delay);
    fn.apply(null, args);
  };
  g.clearTimeout = g.clearInterval = function () {};

  require('setimmediate');

  g.Promise = require('es6-promise').Promise;
  g.Buffer = require('buffer').Buffer;
  g['Buffer.isBuffer'] = require('is-buffer');
  g.URL = require('./url').URL;
  g.fetch = require('./fetch');
})(globalThis);
