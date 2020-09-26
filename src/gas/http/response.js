const inherits = require('inherits');
const stream = require('readable-stream');
const statusCodes = require('builtin-status-codes');

const IncomingMessage = (exports.IncomingMessage = function (opts) {
  const self = this;
  stream.Readable.call(self);

  self._opts = opts;

  self.socket = self.connection = undefined;

  self._destroyed = false;
  self.aborted = false;
  self.complete = false;

  self.httpVersion = '1.1';
  self.httpVersionMajor = 1;
  self.httpVersionMinor = 1;
  self.method = 'GET';
  self.headers = {};
  self.rawHeaders = [];
  self.trailers = {};
  self.rawTrailers = [];
  self.url = opts.url || '';

  self.on('end', () => {
    process.nextTick(() => {
      self.emit('close');
    });
  });

  if (opts.fetchResponse) {
    self._fetchResponse = opts.fetchResponse;
    self._handleGasUrlFetch();
  }

  if (opts.serverRequest) {
    self._serverRequest = opts.serverRequest;
    self._handleGasServerRequest();
  }

  return self;
});

inherits(IncomingMessage, stream.Readable);

IncomingMessage.prototype._handleGasUrlFetch = function () {
  const self = this;
  if (self._destroyed) return;

  const response = self._fetchResponse;

  // response onbject is:
  // https://developers.google.com/apps-script/reference/url-fetch/http-response

  const code = response.getResponseCode();
  self.statusCode = code;
  self.statusMessage = statusCodes[code];

  for (const [key, header] of Object.entries(response.getAllHeaders())) {
    self.headers[key.toLowerCase().trim()] = header;
    self.rawHeaders.push(key, header);
  }

  try {
    self.push(Buffer.from(response.getContent()));
    self.push(null);
  } catch (err) {
    if (!self._destroyed) self.emit('error', err);
  }
};

IncomingMessage.prototype._handleGasServerRequest = function () {
  const self = this;
  if (self._destroyed) return;

  const request = self._serverRequest;

  self.method = request.method;

  for (const [key, header] of Object.entries(request.headers)) {
    self.headers[key.toLowerCase().trim()] = header;
    self.rawHeaders.push(key, header);
  }

  try {
    if (typeof request.body === 'object') request.body = JSON.stringify(request.body);
    self.push(Buffer.from(request.body));
    self.push(null);
  } catch (err) {
    if (!self._destroyed) self.emit('error', err);
  }
};

IncomingMessage.prototype.abort = function () {
  const self = this;
  self.aborted = true;
  self._destroyed = true;
  self.emit('aborted');
  return this;
};

IncomingMessage.prototype.destroy = function (err) {
  const self = this;
  self._destroyed = true;
  if (err) self.emit('error', err);
  return this;
};

IncomingMessage.prototype._read = function () {
  // GAS is sync so response is already complete.
};

IncomingMessage.prototype.setTimeout = function () {};
