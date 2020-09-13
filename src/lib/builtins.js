// https://github.com/browserify/browserify#compatibility
// https://github.com/webpack/node-libs-browser

exports.assert = require.resolve('assert/');
exports.backoff = require.resolve('../gas/backoff');
exports.buffer = require.resolve('buffer/');
exports.constants = require.resolve('../gas/constants');
// exports.crypto = require.resolve('crypto-browserify'); // TODO
exports.domain = require.resolve('domain-browser');
exports.encoding = require.resolve('encoding');
exports.events = require.resolve('events/');
exports.fs = require.resolve('../gas/fs');
exports.gaspack = require.resolve('../gas/gaspack');
exports.gdrive = require.resolve('../gas/fs/gdrive');
exports.http = require.resolve('../gas/http'); // TODO: http2
exports.https = require.resolve('https-browserify');
exports.path = require.resolve('path-browserify');
exports.punycode = require.resolve('punycode/');
exports.querystring = require.resolve('querystring-es3/');
exports.setimmediate = require.resolve('setimmediate');
exports.stream = require.resolve('../gas/stream');
exports.string_decoder = require.resolve('string_decoder/');
exports.sys = require.resolve('util/util.js');
exports.tty = require.resolve('tty-browserify');
exports.url = require.resolve('../gas/url');
exports.util = require.resolve('util/util.js');
exports.vm = require.resolve('../gas/vm');
// exports.zlib = require.resolve('browserify-zlib'); // TODO: works but huge ... implement GAS native
exports['readable-stream'] = require.resolve('readable-stream/readable-browser.js');
exports['require-url'] = require.resolve('../gas/require-url');

// noops
exports.child_process = require.resolve('./_empty.js');
exports.cluster = require.resolve('./_empty.js');
exports.dgram = require.resolve('./_empty.js');
exports.dns = require.resolve('./_empty.js');
exports.inspector = require.resolve('./_empty.js');
exports.module = require.resolve('./_empty.js');
exports.net = require.resolve('./_empty.js');
exports.os = require.resolve('./_empty.js');
exports.perf_hooks = require.resolve('./_empty.js');
exports.readline = require.resolve('./_empty.js');
exports.repl = require.resolve('./_empty.js');
exports.tls = require.resolve('./_empty.js');
