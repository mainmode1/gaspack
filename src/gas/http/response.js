var inherits = require('inherits');
var stream = require('readable-stream');
var statusCodes = require('builtin-status-codes');

// var rStates = (exports.readyStates = {
//   UNSENT: 0,
//   OPENED: 1,
//   HEADERS_RECEIVED: 2,
//   LOADING: 3,
//   DONE: 4,
// });

var IncomingMessage = (exports.IncomingMessage = function (url, response) {
  var self = this;
  stream.Readable.call(self);

  self.headers = {};
  self.rawHeaders = [];
  self.trailers = {};
  self.rawTrailers = [];

  // Fake the 'close' event, but only once 'end' fires
  self.on('end', function () {
    // console.log('http response: end event');
    // The nextTick is necessary to prevent the 'request' module from causing an infinite loop
    // TODO: GAS; necessary?
    process.nextTick(function () {
      // console.log('http response: closed');
      self.emit('close');
    });
  });

  self._fetchResponse = response;

  // https://developers.google.com/apps-script/reference/url-fetch/http-response

  let code = response.getResponseCode();
  self.statusCode = code;
  self.statusMessage = statusCodes[code];

  for (const [key, header] of Object.entries(response.getAllHeaders())) {
    self.headers[key.toLowerCase()] = header;
    self.rawHeaders.push(key, header);
  }

  try {
    self.push(Buffer.from(response.getContent()));
    self.push(null);
    return;
  } catch (err) {
    if (!self._destroyed) self.emit('error', err);
  }
});

inherits(IncomingMessage, stream.Readable);

IncomingMessage.prototype._read = function () {
  // GAS is sync so response is complete ...
  // var self = this;
};
