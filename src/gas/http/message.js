const inherits = require('inherits');
const stream = require('readable-stream');
const statusCodes = require('builtin-status-codes');

const IncomingMessage = (exports.IncomingMessage = function (opts) {
  const self = this;
  stream.Readable.call(self);

  self._opts = opts || {};

  self.socket = null;
  self.connection = {};

  self._destroyed = false;
  self.aborted = false;
  self.complete = false;

  self.httpVersion = '1.1';
  self.httpVersionMajor = 1;
  self.httpVersionMinor = 1;
  self.method = (opts.method || 'GET').toUpperCase();
  self.headers = {};
  self.rawHeaders = [];
  self.trailers = {};
  self.rawTrailers = [];
  self.url = opts.url || '';

  if (opts.fetchResponse) {
    self.on('end', () => {
      // autoclose response to fetch request
      process.nextTick(() => {
        self.emit('close');
      });
    });
    self._createFetchResponse(opts.fetchResponse);
  } else if (opts.serverInjectRequest) {
    self._createServerRequest(opts.serverInjectRequest);
  }

  return self;
});

inherits(IncomingMessage, stream.Readable);

IncomingMessage.prototype._createFetchResponse = function (response) {
  const self = this;
  if (self._destroyed) return;

  try {
    // https://developers.google.com/apps-script/reference/url-fetch/http-response

    const code = response.getResponseCode();
    self.statusCode = code;
    self.statusMessage = statusCodes[code];

    for (const [key, header] of Object.entries(response.getAllHeaders())) {
      self.headers[key.toLowerCase().trim()] = header;
      self.rawHeaders.push(key, header);
    }

    let payload = Buffer.from(response.getContent()) || null;
    if (payload) {
      self._payload = payload;
    }

    self.complete = true;
  } catch (err) {
    if (!self._destroyed) self.emit('error', err);
  }
};

IncomingMessage.prototype._createServerRequest = function (request) {
  const self = this;
  if (self._destroyed) return;

  try {
    self.connection = { encrypted: request.encrypted, remoteAddress: request.remoteAddress || '127.0.0.1' };
    self.method = request.method;

    for (const [key, header] of Object.entries(request.headers)) {
      self.headers[key.toLowerCase().trim()] = header;
      self.rawHeaders.push(key, header);
    }
    self.headers['user-agent'] = self.headers['user-agent'] || 'gaspack';

    let payload = request.payload || null;
    if (payload) {
      if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
        payload = JSON.stringify(payload);
        self.headers['content-type'] = self.headers['content-type'] || 'application/json';
      }

      if (!Object.prototype.hasOwnProperty.call(self.headers, 'content-length')) {
        self.headers['content-length'] = (Buffer.isBuffer(payload)
          ? payload.length
          : Buffer.byteLength(payload)
        ).toString();
      }

      self._payload = payload;
    }
    self.complete = true;
  } catch (err) {
    if (!self._destroyed) self.emit('error', err);
  }
};

IncomingMessage.prototype.abort = function () {
  const self = this;
  self.aborted = true;
  self.emit('aborted');
  return this;
};

IncomingMessage.prototype.destroy = function (err) {
  const self = this;
  self._destroyed = true;
  if (err) self.emit('error', err);
  return this;
};

IncomingMessage.prototype.setTimeout = function () {};

IncomingMessage.prototype._read = function () {
  const self = this;
  if (self._payload) self.push(self._payload);
  if (self.complete) self.push(null);
};
