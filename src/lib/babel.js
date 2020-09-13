const Buffer = require('safe-buffer').Buffer;
const isBuffer = require('is-buffer');
const babel = require('@babel/core');

const { missing, xtend } = require('./helpers');

const defaultBabelOpts = {
  sourceType: 'module',
  compact: false,
  retainLines: true,
  auxiliaryCommentBefore: '',
  auxiliaryCommentAfter: '',
};

function injectBuiltinGlobals(
  codeBuf = missing('code Buffer'),
  { noBabel = false, noGlobals = false, isEntry = false } = {},
) {
  if (!isBuffer(codeBuf)) codeBuf = Buffer.from(codeBuf);
  if (noBabel || noGlobals) return codeBuf;

  function injectGlobalsPlugin() {
    return {
      visitor: {
        Program(path) {
          if (isEntry) return;
          path.get('body').unshiftContainer('body', babel.template.ast(`require('globals');`));
          path.skip();
        },
        FunctionDeclaration(path) {
          if (!isEntry) return;
          path.get('body').unshiftContainer('body', babel.template.ast(`require('gaspack');`));
          // path.get('body').addComment('inner', 'gaspack inject global builtins/shims', false);
          path.skip();
        },
      },
    };
  }

  const transpiled = babel.transformSync(
    codeBuf.toString(),
    xtend(
      defaultBabelOpts,
      { sourceType: isEntry ? 'script' : 'module' /*, auxiliaryCommentBefore: 'gaspack'*/ },
      {
        plugins: [[injectGlobalsPlugin, { concise: false }]],
      },
    ),
  );

  return Buffer.from(transpiled.code);
}

function gasTransforms(codeBuf = missing('code Buffer'), { noBabel = false, isEntry = false } = {}) {
  if (!isBuffer(codeBuf)) codeBuf = Buffer.from(codeBuf);
  if (noBabel) return codeBuf;

  const transpiled = babel.transformSync(
    codeBuf.toString(),
    xtend(
      defaultBabelOpts,
      { sourceType: isEntry ? 'script' : 'module' },
      {
        plugins: [
          [
            require.resolve('babel-plugin-rewrite-require'),
            {
              strictMode: !isEntry,
              concise: false,
              aliases: {
                // for example:
                // stream: 'readable-stream',
              },
            },
          ],
          [
            require.resolve('@babel/plugin-transform-modules-commonjs'),
            {
              strictMode: !isEntry,
              concise: false,
              // https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs#via-node-api
              loose: true,
              strict: false,
              noInterop: true,
              // lazy: (string) => boolean,
            },
          ],
          [
            require.resolve('babel-plugin-transform-async-to-promises'),
            {
              strictMode: !isEntry,
              concise: false,
              // https://github.com/rpetrich/babel-plugin-transform-async-to-promises
              inlineHelpers: true,
              externalHelpers: false,
              minify: true,
              hoist: false,
            },
          ],
        ],
      },
    ),
  );

  return Buffer.from(transpiled.code);
}

module.exports = { injectBuiltinGlobals, gasTransforms };
