const fs = require('fs');
const path = require('path');

const dbgpack = require('debug')('pack');
const through = require('through2');

const resolver = require('./lib/resolver');
const bundler = require('./lib/bundler');

module.exports = ({ modulesPath = '', ...opts } = {}) => {
  return through.obj(async function (entry, enc, done) {
    if (entry.isNull()) return done(null, entry);
    if (entry.isStream()) {
      this.emit('error', new Error('entry cannot be stream'));
    } else if (entry.isBuffer()) {
      this.on('data', (chunk) => dbgpack(chunk.relative));

      opts.paths = ['node_modules'];
      // TODO: modulesPath to []
      if (modulesPath) {
        modulesPath = modulesPath && path.normalize(modulesPath);
        if (modulesPath && !fs.statSync(modulesPath).isDirectory())
          throw Error(`modulesPath: ${modulesPath} is not a directory`);
        opts.paths.push(modulesPath);
      }

      if (dbgpack.enabled) console.time('resolver');
      const modules = resolver(entry.path, opts);
      if (dbgpack.enabled) console.timeEnd('resolver');

      if (dbgpack.enabled) console.time('bundler');
      const bundle = await bundler(modules, opts);
      if (dbgpack.enabled) console.timeEnd('bundler');

      for (let i = 0, n = bundle.modules.length; i < n; ++i) {
        this.push(bundle.modules[i].gas);
      }

      done();
    }
  });
};
