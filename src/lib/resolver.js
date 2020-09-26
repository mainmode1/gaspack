const dbgresolver = require('debug')('resolver');

// const nodeResolve = require('resolve').sync;
const browserResolve = require('browser-resolve').sync;

const builtins = require('../lib/builtins');
const { create, ModType } = require('./module');
const { missing } = require('./helpers');

function resolver(filename = missing('filename'), opts) {
  let { cache = {}, type = ModType.ENTRY, requires = [] } = opts;

  if (cache[filename]) {
    dbgresolver('already visited', filename);
    return cache[filename];
  }

  const modules = new Set(),
    resolved = {};

  if (!opts.noRequireUrl && type === ModType.ENTRY) requires.push('require-url');
  const module = create(filename, { type, requires, ...opts });
  modules.add(module);

  // handle recursive circular dependencies
  cache[filename] = [...modules];

  if (module.requires.length) {
    dbgresolver('traversing', module.filename, 'dependencies:', module.requires);
    for (let dependency of module.requires) {
      opts.parent = module.filename;

      if (builtins[dependency]) {
        opts.type = ModType.BUILTIN;
        resolved[dependency] = builtins[dependency];
      } else {
        opts.basedir = module.basedir;
        opts.type = module.type === ModType.BUILTIN ? ModType.BUILTIN : ModType.APP;
        const resolve = browserResolve; //TODO opts switch
        resolved[dependency] = resolve(dependency, { basedir: module.path, moduleDirectory: opts.paths });
      }
      dbgresolver('resolved', dependency, '=>', resolved[dependency]);

      // recursively traverse dependency tree
      for (let depModule of resolver(resolved[dependency], { cache, ...opts })) {
        modules.add(depModule);
      }

      // dependency map for use by global require chain
      module.map[dependency] = [...modules].find((m) => m.filename === resolved[dependency]).id;
    }
  }

  module.children = resolved;
  dbgresolver(module.gas.path, module.type, module.id, modules.size, module.map);

  return (cache[filename] = [...modules]);
}

module.exports = resolver;
