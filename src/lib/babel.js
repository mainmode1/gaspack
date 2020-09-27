const fs = require('fs');
const Buffer = require('safe-buffer').Buffer;
const isBuffer = require('is-buffer');

const babel = require('@babel/core');
const rewriteRequire = require('babel-plugin-rewrite-require');
const modulesToCjs = require('@babel/plugin-transform-modules-commonjs');
const asyncToPromises = require('babel-plugin-transform-async-to-promises');

const dbgbabel = require('debug')('transform');

const { cleanSrcBuf, missing, xtend } = require('./helpers');

const defaultBabelOpts = {
  sourceType: 'module',
  compact: false,
  retainLines: true,
  auxiliaryCommentBefore: '',
  auxiliaryCommentAfter: '',
  babelrc: false,
  configFile: false,
};

function _injectGlobalsPlugin() {
  return {
    visitor: {
      // Program(path) {
      //   path.get('body').unshiftContainer('body', babel.template.ast(`require('globals');`));
      //   path.skip();
      // },
      FunctionDeclaration(path) {
        path.get('body').unshiftContainer('body', babel.template.ast(`require('gaspack');`));
        // path.get('body').addComment('inner', '!gaspack', false);
        path.skip();
      },
    },
  };
}

const defaultPlugins = [
  [
    modulesToCjs,
    {
      concise: false,
      // https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs#via-node-api
      loose: true,
      strict: false,
      noInterop: true,
      // lazy: (string) => boolean,
    },
  ],
  [
    asyncToPromises,
    {
      concise: false,
      // https://github.com/rpetrich/babel-plugin-transform-async-to-promises
      inlineHelpers: true,
      externalHelpers: false,
      minify: true,
      hoist: false,
    },
  ],
  [
    rewriteRequire,
    {
      concise: false,
      aliases: {
        // eg. stream: 'readable-stream',
      },
    },
  ],
];

function gasTransforms({ noBabel = false, isEntry = false, source = '', filename = '' } = {}) {
  const babelOpts = xtend(defaultBabelOpts, { sourceType: isEntry ? 'script' : 'module' }, { plugins: defaultPlugins });

  if (source && source.length) {
    if (!isBuffer(source)) source = Buffer.from(source);
    if (noBabel) return source;

    const transpiled = babel.transformSync(source.toString(), babelOpts);
    dbgbabel('gasTransforms (source)', filename);
    return Buffer.from(transpiled.code);
  } else {
    if (noBabel) return cleanSrcBuf(fs.readFileSync(filename));

    const transpiled = babel.transformFileSync(
      filename,
      xtend(defaultBabelOpts, { sourceType: isEntry ? 'script' : 'module' }, { plugins: defaultPlugins }),
    );
    dbgbabel('gasTransforms (file)', filename);
    return Buffer.from(transpiled.code);
  }
}

function injectBuiltinGlobals({ noGlobals = false, isEntry = false, source = missing('source'), filename = '' } = {}) {
  if (!isBuffer(source)) source = Buffer.from(source);
  if (noGlobals || !isEntry) return source;

  const transpiled = babel.transformSync(
    source.toString(),
    xtend(
      defaultBabelOpts,
      { sourceType: isEntry ? 'script' : 'module' /*, auxiliaryCommentBefore: '!gaspack'*/ },
      { plugins: [[_injectGlobalsPlugin, { concise: false }]] },
    ),
  );
  dbgbabel('injectBuiltinGlobals', filename);
  return Buffer.from(transpiled.code);
}

module.exports = { gasTransforms, injectBuiltinGlobals };
