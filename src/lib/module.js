const fs = require('fs');
const path = require('path');

const dbgmeta = require('debug')('module:meta'),
  dbgcreate = require('debug')('module:create'),
  dbgjson = require('debug')('module:json');

const File = require('vinyl');
const detective = require('detective');
const sanitize = require('htmlescape').sanitize;

const { gasTransforms, injectBuiltinGlobals } = require('./babel');
const { fnv32a, isChildPath, isJson, isUrl, makeEnum, missing, uniqArr, xtend } = require('./helpers');

const ModType = makeEnum(['ENTRY', 'APP', 'LIB', 'BUILTIN', 'NODE', 'BUNDLE']);

const gasProjDefaultPaths = {
  gasModules: 'lib',
  nodeModules: 'node_modules',
  builtins: 'builtins',
};

const gasShims = path.normalize(path.resolve(__dirname, '../gas'));

// adapted from: https://nodejs.org/api/modules.html#modules_the_module_object
const GasModule = {
  children: [], // module objects required for the first time by this one; gaspack: filename map
  exports: {},
  filename: '', // fully resolved filename of the module (local fs)
  id: '', //  module identifier, typically filename; gaspack: fnv hash of GAS proj virtual path
  loaded: false,
  parent: {}, // module that first required this one; gaspack: filename
  path: '', // directory name of the module
  paths: [], // search paths
  require: function () {},
};

const moduleCache = new Map();

function _meta(filename, opts) {
  let { basedir = '', type = ModType.APP, paths = [], gasPaths = {} } = opts;

  basedir = basedir || path.dirname(filename);
  if (isChildPath('node_modules', filename) || filename.includes('node_modules')) basedir = 'node_modules';

  if (type === ModType.BUILTIN) {
    if (isChildPath(gasShims, filename)) basedir = gasShims;
  } else {
    if (basedir === 'node_modules') {
      type = ModType.NODE;
    } else {
      const gasLibSearchPaths = paths.filter((path) => !path.includes('node_modules'));
      for (let libPath of gasLibSearchPaths) {
        if (isChildPath(libPath, filename)) {
          type = ModType.LIB;
          basedir = libPath;
        }
      }
    }
  }

  gasPaths = xtend(gasProjDefaultPaths, gasPaths);

  const re = new RegExp(`${basedir}(.+)`),
    vrelative = filename.split(re)[1].replace(/^\/+/, ''),
    vreldirname = path.parse(vrelative).dir,
    vbase =
      type === ModType.LIB
        ? gasPaths.gasModules
        : basedir === 'node_modules'
        ? gasPaths.nodeModules
        : type === ModType.BUILTIN
        ? gasPaths.builtins
        : '.',
    vdirname = path.join(vbase, vreldirname),
    vpath = path.join(vdirname, path.parse(vrelative).base);

  // Fowler–Noll–Vo hash of GAS proj virtual path; see: http://isthe.com/chongo/tech/comp/fnv/
  const id = fnv32a(vpath);

  dbgmeta(vpath, type, id);
  return { type, basedir, vpath, id };
}

function create(filename = missing('filename'), opts) {
  filename = path.normalize(filename);

  let { requires = [], paths = [], parent = '' } = opts;
  let { type, basedir, vpath, id } = _meta(filename, opts);

  if (moduleCache.has(id)) {
    let cachedModule = moduleCache.get(id);
    dbgcreate('dedupe module', cachedModule.gas.path, id);
    return cachedModule;
  }

  let source = '';
  if (isJson(filename)) {
    source = sanitize(fs.readFileSync(filename, 'utf-8'));
    try {
      // check json validity
      JSON.parse(source);
      source = Buffer.from('module.exports=' + source);
    } catch (err) {
      err.message = 'while parsing ' + filename + ': ' + err.message;
      throw Error(err);
    }
    vpath = path.join(path.dirname(vpath), path.basename(vpath, path.extname(vpath)) + '.js');
    dbgjson('JSON to module', filename, vpath);
  } else {
    // babel; transpile to GAS
    source = gasTransforms({ isEntry: type === ModType.ENTRY, filename, ...opts });

    // babel; inject global builtins/shims to GAS entry functions
    source = injectBuiltinGlobals({ isEntry: type === ModType.ENTRY, source, filename, ...opts });

    // fnow ind require'd dependencies, excluding url's (with optional injection from requires[] param)
    requires = uniqArr(detective(source /*{ word: 'require' }*/).concat(requires));
    requires = requires.filter((dep) => !isUrl(dep));
  }

  let newModule = xtend(GasModule, {
    basedir,
    filename,
    gas: new File({ path: vpath, contents: source }), // Vinyl GAS project file
    id,
    map: {},
    parent,
    path: path.dirname(filename),
    paths,
    requires,
    type,
  });

  dbgcreate('created', newModule.filename, '=>', newModule.gas.path, type, id);
  moduleCache.set(id, newModule);
  return newModule;
}

module.exports = { create, ModType };
