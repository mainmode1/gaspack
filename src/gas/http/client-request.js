// adapted from: https://github.com/jhiesey/stream-http

const inherits = require('inherits');
const stream = require('readable-stream');
const statusCodes = require('builtin-status-codes');

const urlFetch = require('../backoff').wrap(eval('UrlFetch' + 'App').fetch);

const IncomingMessage = require('./message').IncomingMessage;

const ClientRequest = (module.exports = function (opts) {
  const self = this;
  stream.Writable.call(self);

  self._opts = opts || {};

  self.socket = null;
  self.destroyed = false;

  self._body = [];
  self._headers = {};

  if (opts.auth) self.setHeader('Authorization', 'Basic ' + Buffer.from(opts.auth).toString('base64'));

  Object.keys(opts.headers).forEach((name) => {
    self.setHeader(name, opts.headers[name]);
  });

  self.on('finish', () => {
    self._onFinish();
  });

  return self;
});

inherits(ClientRequest, stream.Writable);

ClientRequest.prototype.setHeader = function (name, value) {
  const self = this;
  const lowerName = name.toLowerCase();

  if (unsafeHeaders.includes(lowerName)) return;

  self._headers[lowerName] = {
    name: name,
    value: value,
  };
};

ClientRequest.prototype.getHeader = function (name) {
  return this._headers[name.toLowerCase()];
};

ClientRequest.prototype.removeHeader = function (name) {
  delete this._headers[name.toLowerCase()];
};

ClientRequest.prototype.getHeader = function (name) {
  const header = this._headers[name.toLowerCase()];
  if (header) return header.value;
  return null;
};

ClientRequest.prototype.removeHeader = function (name) {
  const self = this;
  delete self._headers[name.toLowerCase()];
};

ClientRequest.prototype._onFinish = function () {
  const self = this;
  if (self.destroyed) return;
  const opts = self._opts;

  const headersObj = self._headers;
  let body = null;

  if (opts.method !== 'GET' && opts.method !== 'HEAD') {
    body = Buffer.concat(self._body);
    body = Utilities.newBlob(body, self.getHeader('content-type') || '');
  }

  const urlFetchHeaders = {};
  Object.keys(headersObj).forEach((keyName) => {
    const name = headersObj[keyName].name;
    const value = headersObj[keyName].value;
    urlFetchHeaders[name] = value;
  });

  // https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app

  const urlFetchOpts = {
    method: opts.method,
    headers: urlFetchHeaders,
    payload: body || undefined,
    followRedirects: true, // default
    muteHttpExceptions: true,
  };

  const response = urlFetch(self._opts.url, urlFetchOpts);

  const code = response.getResponseCode();
  if (((code / 100) | 0) == 2) {
    self._fetchResponse = response;
    self._connect();
  } else {
    if (!self.destroyed) self.emit('error', statusCodes[code]);
  }
};

ClientRequest.prototype._connect = function () {
  const self = this;
  if (self.destroyed) return;

  self._response = new IncomingMessage({ url: self._opts.url, fetchResponse: self._fetchResponse });

  self._response.on('error', (err) => {
    self.emit('error', err);
  });

  self.emit('response', self._response);
};

ClientRequest.prototype._write = function (data, encoding, cb) {
  const self = this;
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = undefined;
  }
  self._body.push(Buffer.from(data, encoding));
  if (typeof cb === 'function') cb();
};

ClientRequest.prototype.destroy = function (err) {
  const self = this;
  self.destroyed = true;
  if (self._response) self._response._destroyed = true;
  if (err) self.emit('error', err);
  return this;
};

ClientRequest.prototype.end = function (data, encoding, cb) {
  const self = this;
  if (typeof data === 'function') {
    cb = data;
    data = undefined;
  }
  stream.Writable.prototype.end.call(self, data, encoding, cb);
  return this;
};

ClientRequest.prototype.flushHeaders = function () {};
ClientRequest.prototype.setTimeout = function () {};
ClientRequest.prototype.setNoDelay = function () {};
ClientRequest.prototype.setSocketKeepAlive = function () {};

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
const unsafeHeaders = [
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
