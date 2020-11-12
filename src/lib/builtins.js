// https://github.com/browserify/browserify#compatibility
// https://github.com/webpack/node-libs-browser

exports.assert = require.resolve('assert/');
exports.backoff = require.resolve('../gas/backoff');
exports.buffer = require.resolve('buffer/');
exports.constants = require.resolve('../gas/constants');
exports.crypto = require.resolve('crypto-browserify');
exports.domain = require.resolve('domain-browser');
exports.encoding = require.resolve('encoding');
exports.events = require.resolve('events/');
exports.fs = require.resolve('../gas/fs');
exports.gaspack = require.resolve('../gas/gaspack');
exports.http = require.resolve('../gas/http');
exports.https = require.resolve('https-browserify');
exports.path = require.resolve('path-browserify');
exports.punycode = require.resolve('punycode/');
exports.querystring = require.resolve('querystring-es3/');
exports['readable-stream'] = require.resolve('readable-stream/readable-browser.js');
exports['require-url'] = require.resolve('../gas/require-url');
exports.stream = require.resolve('../gas/stream');
exports.string_decoder = require.resolve('string_decoder/');
exports.timers = require.resolve('timers-browserify');
exports.sys = require.resolve('util/util.js');
exports.tty = require.resolve('tty-browserify');
exports.url = require.resolve('../gas/url');
exports.util = require.resolve('util/util.js');
exports.vm = require.resolve('../gas/vm');
exports.zlib = require.resolve('browserify-zlib');

// not implemented

//https://github.com/AndreasMadsen/async-hook/issues/15, https://github.com/creditkarma/async-hooks
exports.async_hooks = require.resolve('../gas/_empty.js');

exports.child_process = require.resolve('../gas/_empty.js');
exports.cluster = require.resolve('../gas/_empty.js');
exports.dgram = require.resolve('../gas/_empty.js');
exports.dns = require.resolve('../gas/_empty.js');
exports.http2 = require.resolve('../gas/_empty.js');
exports.inspector = require.resolve('../gas/_empty.js');
exports.module = require.resolve('../gas/_empty.js');
exports.net = require.resolve('../gas/_empty.js');
exports.os = require.resolve('../gas/_empty.js');
exports.perf_hooks = require.resolve('../gas/_empty.js');
exports.readline = require.resolve('../gas/_empty.js');
exports.repl = require.resolve('../gas/_empty.js');
exports.tls = require.resolve('../gas/_empty.js');
