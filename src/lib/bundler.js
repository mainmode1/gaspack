const fs = require('fs');
const path = require('path');

const dbgbundler = require('debug')('bundler');

const File = require('vinyl');

const { ModType } = require('./module');
const minifier = require('./minifier');
const { bappend, bprepend, has, missing, uniqArrayOfProp, xtend } = require('./helpers');

const templateMinifyOpts = {
  // https://github.com/mishoo/UglifyJS/issues/640
  compress: { negate_iife: false },
  output: { max_line_len: false, comments: '/^!/' },
};

const gasDefaultBundles = {
  nodeModulesBundle: 'node_modules.js',
  builtinsBundle: 'builtins.js',
};

const preludePath = path.join(__dirname, '../templates/require-prelude.js');
const preludeSrc = fs.readFileSync(preludePath).slice(0, -2); // remove trailing semi + whitespace
const _preludeMin = async () => (await minifier(preludeSrc, { minifyopts: templateMinifyOpts })).slice(0, -1); // remove trailing semi

async function _wrapModule(module = missing('module')) {
  if (!has(module, 'gas')) return module;

  // adapted from: https://github.com/browserify/browser-pack/blob/master/index.js
  let wrappedSrc = [
    JSON.stringify(module.id),
    ':[{',

    // dependency map
    Object.keys(module.map || {})
      .sort()
      .map((key) => {
        return JSON.stringify(key) + ':' + JSON.stringify(module.map[key]);
      })
      .join(',') + '},',

    // SyntaxError: Illegal 'use strict' directive in function with non-simple parameter list
    // "function(require,module,exports,__dirname='" + module.gas.dirname + "',__filename='" + module.gas.path + "'){",
    'function(exports,require,module){',
    "const __dirname='" + module.gas.dirname + "',__filename='" + module.gas.path + "';",
    '/*eslint-disable-line no-unused-vars*/',

    '\n', // + '/*' + module.gas.path + ' BEGIN*/',

    // (?transformed) module source
    module.gas.contents.toString(),

    '\n/*!END ' + module.gas.path + '*/',

    // update the 'async' clock
    // `;'undefined'!=typeof process&&process&&'function'==typeof process.tick&&process.tick();`,
    // '/*eslint-disable-line no-extra-semi*/',

    '}]',
  ].join('');

  return Buffer.from(wrappedSrc);
}

async function _rollup(modules = missing('modules'), { prelude, filename = 'bundle.js', noMinify = false } = {}) {
  if (!modules.length) return [];

  dbgbundler('rollup', modules.length, 'modules');

  const wrappedBuf = (await Promise.all(modules.map(async (m) => await _wrapModule(m)))).join(',');
  let srcBuf = bappend(prelude, '({},{},{' + wrappedBuf + '});');

  let size = srcBuf.length;
  if (!noMinify) {
    srcBuf = bprepend(
      await minifier(srcBuf, { minifyopts: { output: { max_line_len: 120, comments: false } } }),
      '/*eslint-disable*/\n',
    );
  }

  const gas = new File({ path: filename, contents: srcBuf });
  gas.extname = noMinify ? '.js' : '.min.js';

  dbgbundler(gas.path, gas.contents.length, 'bytes', (((size - gas.contents.length) / size) * 100).toFixed(2) + '%');

  return [{ filename: gas.path, type: ModType.BUNDLE, gas }];
}

async function bundler(modules = missing('modules'), { noMinify = false, noBundle = false, ...opts } = {}) {
  const gasPaths = xtend(gasDefaultBundles, opts.gasPaths);
  const prelude = await _preludeMin();

  let node = modules.filter((m) => m.type === ModType.NODE),
    builtins = modules.filter((m) => m.type === ModType.BUILTIN),
    standalone = modules.filter((m) => m.type === ModType.APP || m.type === ModType.LIB),
    entry = modules.find((m) => m.type === ModType.ENTRY);

  if (noBundle) {
    modules = [];
    standalone = [...standalone, ...node, ...builtins];
  } else {
    // bundle builtins and node pkg dependencies into single (?minified) file
    if (dbgbundler.enabled) console.time('rollup');
    let [nodeBundle = [], builtinsBundle = []] = await Promise.all([
      _rollup(node, { prelude, filename: gasPaths.nodeModulesBundle, noMinify }),
      _rollup(builtins, { prelude, filename: gasPaths.builtinsBundle, noMinify }),
    ]);
    modules = [...nodeBundle, ...builtinsBundle];
    if (dbgbundler.enabled) console.timeEnd('rollup');
  }

  dbgbundler('wrap', standalone.length, 'modules');
  if (dbgbundler.enabled) console.time('wrap');
  for (let i = 0, n = standalone.length; i < n; ++i) {
    standalone[i].gas.contents = bappend(prelude, '({},{},{' + (await _wrapModule(standalone[i])) + '});');
  }
  modules = [...standalone, ...modules];
  if (dbgbundler.enabled) console.timeEnd('wrap');

  // prepend global require to entry
  entry.gas.contents = Buffer.concat([
    bappend(prelude, '({},' + JSON.stringify(entry.map) + ',{});\n'),
    entry.gas.contents,
  ]);
  modules = [entry, ...modules];

  const files = uniqArrayOfProp(
    modules.filter((m) => m.type !== ModType.BUNDLE),
    'filename',
  );

  if (dbgbundler.enabled) {
    let bundles = modules.filter((m) => m.type === ModType.BUNDLE);
    dbgbundler(modules.length, 'total modules', files.length, 'local project files', bundles.length, 'bundles');
  }

  // final GAS project bundle
  return { modules, files };
}

module.exports = bundler;
