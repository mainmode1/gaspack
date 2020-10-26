const path = require('path');

const dbgresolver = require('debug')('resolver');

// const nodeResolve = require('resolve').sync;
const browserResolve = require('browser-resolve').sync;

const builtins = require('../lib/builtins');
const { create, ModType } = require('./module');
const { isEmpty, missing } = require('./helpers');

function resolver(filename = missing('filename'), opts) {
  let { cache = {}, type = ModType.ENTRY, requires = [] } = opts;

  if (cache[filename]) {
    dbgresolver('already visited', filename);
    return cache[filename];
  }

  const tree = new Set(),
    resolved = {};

  if (!opts.noRequireUrl && type === ModType.ENTRY) requires.push('require-url');
  const module = create(filename, { type, requires, ...opts });

  if (!isEmpty(module.map)) {
    dbgresolver('already traversed', module.gas.path, module.id);
    return [module];
  }

  tree.add(module);

  // handle recursive circular dependencies
  cache[filename] = [...tree];

  if (module.requires.length) {
    dbgresolver('traversing', module.filename, 'dependencies', module.requires);
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

      // recursively traverse dependency tree & create module dependency map for global require chain
      const depTree = resolver(resolved[dependency], { cache, ...opts });
      if (depTree.length === 1) {
        // already traversed
        let depModule = depTree[0];
        tree.add(depModule);
        module.map[dependency] = depModule.id;
      } else {
        for (let depModule of depTree) {
          tree.add(depModule);
        }
        module.map[dependency] = [...tree].find((m) => m.filename === resolved[dependency]).id;
      }
    }
  }

  module.children = resolved;
  dbgresolver('traversed', path.relative(process.cwd(), filename), 'tree size', tree.size, 'map', module.map);
  return (cache[filename] = [...tree]);
}

module.exports = resolver;
