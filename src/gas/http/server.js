// see: https://github.com/rill-js/http
const http = require('@rill/http');
const stream = require('readable-stream');

const server = (module.exports = {});

server.Server = http.Server;
server.IncomingMessage = http.IncomingMessage;
server.ServerResponse = http.ServerResponse;

const _nullSocket = function () {
  return new stream.Writable({
    write(chunk, encoding, callback) {
      setImmediate(callback);
    },
  });
};

server.ServerResponse.prototype.assignSocket = () => _nullSocket();
server.ServerResponse.prototype._header = '';

server.create = function (opts, requestListener) {
  if (typeof opts === 'function') requestListener = opts;
  const server = http.createServer({}, requestListener);
  return server;
};
