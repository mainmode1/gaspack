// see: https://github.com/rill-js/http
const http = require('@rill/http');
const stream = require('readable-stream');
const parseUrl = require('url').parse;

const IncomingMessage = require('./message').IncomingMessage;
const urlToOpts = require('./util').urlToHttpRequestOpts;

const missing = /*prettier-ignore*/ r=>{throw Error(`${r} parameter required`)};

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
  return http.createServer({}, requestListener);
};

let start = null;
const _debugEvents = (emitter, type) => {
  const oldEmit = emitter.emit,
    end = Date.now(),
    diff = start === null ? 0 : end - start;
  start = end;
  emitter.emit = function (...args) {
    console.log(
      type || emitter.constructor.name,
      'listeners',
      emitter.listenerCount(args[0]),
      Buffer.isBuffer(args[1]) ? [args[0], args[1].toString()] : args,
      `+${diff}ms`,
    );
    oldEmit.apply(emitter, arguments);
  };
};

server.inject = function (server = missing('server'), url, opts = {}) {
  opts = typeof url === 'string' ? Object.assign(opts, urlToOpts(parseUrl(url))) : url || {};

  const protocol = opts.protocol || 'http:';
  const port = opts.port || opts.defaultPort; // || protocol === 'https:' ? 443 : 80;
  const path = opts.path || '/';
  const host = opts.hostname || opts.host; // || 'localhost';

  // may be relative url
  opts.url = (host ? protocol + '//' + host : '') + (port ? ':' + port : '') + path;

  opts.method = (opts.method || 'GET').toUpperCase();
  opts.headers = opts.headers || {};

  // node default
  opts.headers['Transfer-Encoding'] = 'chunked';

  return new Promise((resolve, reject) => {
    const request = new IncomingMessage({
      url: path,
      serverInjectRequest: {
        encrypted: protocol === 'https:',
        remoteAddress: '',
        method: opts.method,
        headers: opts.headers,
        payload: opts.payload || opts.data || opts.body,
        server,
      },
    });
    if (opts.debugEvents) _debugEvents(request, 'ServerRequest');
    request.on('error', (err) => reject(err));

    const response = new http.ServerResponse(request);
    if (opts.debugEvents) _debugEvents(response, 'ServerResponse');
    response.on('error', (err) => reject(err));

    if (!opts.middleware) {
      request.on('data', (chunk) => {
        request.body = chunk.toString();
      });
    }

    response.once('finish', () => {
      // autoclose request
      process.nextTick(() => request.emit('close'));

      // raw payload as a Buffer
      response.rawPayload = response.rawData =
        response._body && response._body.length
          ? Buffer.concat(response._body.map((chunk) => Buffer.from(chunk)))
          : Buffer.from('');

      // payload as a UTF-8 encoded string
      response.payload = response.rawPayload.toString();

      // new Response(...res.data) when paired with the fetch API
      response.data = {
        body: Utilities.newBlob(response.rawPayload, response.getHeader('content-type') || ''),
        res: {
          headers: response.getHeaders(),
          status: response.statusCode,
          statusText: response.statusMessage,
          url: request.url,
        },
      };

      return resolve(response);
    });

    server.emit('request', request, response);

    // server requests from inject, ie. IncomingMessage stream, are paused to allow middleware listeners to fire
    // ... because sync
    if (request.isPaused()) request.resume();
  });
};

// https://developers.google.com/apps-script/guides/web#request_parameters

// const options = {
//   hostname: 'localhost',
//   path: '/test2', // should include query string if any
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/x-www-form-urlencoded',
//     'Content-Length': Buffer.byteLength(postData),
//   },
//   data: postData,
// };

// e.queryString name=alice&n=1&n=2
// e.pathInfo
// e.contentLength (-1 for GET)
// e.postData.type MIME type of the POST body
// e.postData.contents text of the POST body

//TODO

server.doGet = function () {};
server.doPost = function () {};
