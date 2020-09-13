const Buffer = require('safe-buffer').Buffer;
const isBuffer = require('is-buffer');
const { minify } = require('terser');

const { xtend } = require('./helpers');

// https://github.com/terser/terser#minify-options
const defaultMinifyOpts = {
  compress: {
    global_defs: {
      // https://github.com/terser/terser#conditional-compilation-api
      //  :
      // "@alert": "console.log"
    },
    // side_effects: false,
    passes: 2,
  },
  output: {
    beautify: false,
    // preamble: '',
    max_line_len: 120,
    comments: 'some',
    quote_style: 0,
  },
  mangle: {
    reserved: [],
  },
};

async function minifier(src = '', { minifyopts = {} } = {}) {
  let result = await minify(isBuffer(src) ? src.toString() : src, xtend(defaultMinifyOpts, minifyopts));
  if (!result.code) throw Error(result.error);
  return Buffer.from(result.code || '');
}

module.exports = minifier;
