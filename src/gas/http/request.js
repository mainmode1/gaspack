var inherits = require('inherits');
var response = require('./response');
var stream = require('readable-stream');
var statusCodes = require('builtin-status-codes');

const urlFetch = require('../backoff').wrap(eval('UrlFetch' + 'App').fetch);

var IncomingMessage = response.IncomingMessage;
// var rStates = response.readyStates;

var ClientRequest = (module.exports = function (opts) {
  var self = this;
  stream.Writable.call(self);

  self._opts = opts;
  self._body = [];
  self._headers = {};

  self._destroyed = false;

  if (opts.auth) self.setHeader('Authorization', 'Basic ' + Buffer.from(opts.auth).toString('base64'));

  Object.keys(opts.headers).forEach(function (name) {
    self.setHeader(name, opts.headers[name]);
  });

  self.on('finish', function () {
    self._onFinish();
  });

  // console.log('http request:', opts);
});

inherits(ClientRequest, stream.Writable);

ClientRequest.prototype.setHeader = function (name, value) {
  var self = this;
  var lowerName = name.toLowerCase();

  // This check is not necessary, but it prevents warnings from browsers about setting unsafe
  // headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
  // http-browserify did it, so I will too.
  if (unsafeHeaders.indexOf(lowerName) !== -1) return;

  self._headers[lowerName] = {
    name: name,
    value: value,
  };
};

ClientRequest.prototype.getHeader = function (name) {
  var header = this._headers[name.toLowerCase()];
  if (header) return header.value;
  return null;
};

ClientRequest.prototype.removeHeader = function (name) {
  var self = this;
  delete self._headers[name.toLowerCase()];
};

ClientRequest.prototype._onFinish = function () {
  var self = this;
  if (self._destroyed) return;
  var opts = self._opts;

  var headersObj = self._headers;
  var body = null;

  if (opts.method !== 'GET' && opts.method !== 'HEAD') {
    body = Buffer.concat(self._body);
    body = Utilities.newBlob(body, self.getHeader('content-type') || '');
  }

  var urlFetchHeaders = {};
  Object.keys(headersObj).forEach(function (keyName) {
    var name = headersObj[keyName].name;
    var value = headersObj[keyName].value;
    urlFetchHeaders[name] = value;
  });

  // https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app

  const urlFetchOpts = {
    method: self._opts.method,
    headers: urlFetchHeaders,
    payload: body || undefined,
    followRedirects: true, // default
    muteHttpExceptions: true,
  };

  // console.log('http request: UrlFetchApp', self._opts.url, urlFetchOpts);
  // console.log('http request: payload', body ? body.getDataAsString() : undefined);

  let response = urlFetch(self._opts.url, urlFetchOpts);

  let code = response.getResponseCode();

  if (((code / 100) | 0) == 2) {
    self._fetchResponse = response;
    self._connect();
  } else {
    if (!self._destroyed) self.emit('error', statusCodes[code]);
  }
};

ClientRequest.prototype._connect = function () {
  var self = this;

  if (self._destroyed) return;

  self._response = new IncomingMessage(self._opts.url, self._fetchResponse);
  self._response.on('error', function (err) {
    self.emit('error', err);
  });

  self.emit('response', self._response);
};

ClientRequest.prototype._write = function (chunk, encoding, cb) {
  var self = this;
  // console.log('http request: write', chunk.toString());
  self._body.push(chunk);
  cb();
};

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
  var self = this;
  self._destroyed = true;
  if (self._response) self._response._destroyed = true;
};

ClientRequest.prototype.end = function (data, encoding, cb) {
  var self = this;
  // console.log('http request: end');
  if (typeof data === 'function') {
    cb = data;
    data = undefined;
  }

  stream.Writable.prototype.end.call(self, data, encoding, cb);
};

ClientRequest.prototype.flushHeaders = function () {};
ClientRequest.prototype.setTimeout = function () {};
ClientRequest.prototype.setNoDelay = function () {};
ClientRequest.prototype.setSocketKeepAlive = function () {};

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
  'accept', // gaspack
  'user-agent', // gaspack
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
];
