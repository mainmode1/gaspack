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
  const server = http.createServer({}, requestListener);
  return server;
};

let start = null;
const _debugEvent = (emitter, type) => {
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

server.inject = function (targetServer = missing('server'), url, opts = {}) {
  if (!(targetServer instanceof http.Server)) throw TypeError('server is not instance of http.Server');
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
        targetServer,
      },
    });

    const response = new http.ServerResponse(request);

    if (opts.debugEvents) _debugEvent(request, 'ServerRequest');
    if (opts.debugEvents) _debugEvent(response, 'ServerResponse');

    request.on('error', (err) => reject(err));
    response.on('error', (err) => reject(err));

    request.once('readable', () => {
      let chunk;
      if (null !== (chunk = request.read())) {
        request.body = chunk.toString();
      }
    });

    response.once('finish', () => {
      // autoclose request
      process.nextTick(() => {
        request.emit('close');
      });

      // raw payload as a Buffer
      response.rawPayload = response.rawData =
        response._body && response._body.length
          ? Buffer.concat(response._body.map((chunk) => Buffer.from(chunk)))
          : Buffer.from('');

      // payload as a UTF-8 encoded string
      response.payload = response.rawPayload.toString();

      // allow new Response(...response.data) when paired with the fetch API
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

    // if (opts.debugEvents) _debugEvent(targetServer, 'Server');

    // queue request
    process.nextTick(() => {
      targetServer.emit('request', request, response);
    });

    if (request.isPaused()) request.resume();
  });
};

server.handleWebAppEvent = function (e = missing('webapp event obj'), targetServer, callback, opts = {}) {
  const err = {
    // https://google.github.io/styleguide/jsoncstyleguide.xml
    error: {
      code: undefined,
      message: undefined,
    },
  };

  if (!targetServer || !(targetServer instanceof http.Server)) {
    err.error.code = 500;
    err.error.message = 'target server obj is not instance of http.Server';
    let output = ContentService.createTextOutput()
      .setContent(JSON.stringify(err))
      .setMimeType(ContentService.MimeType.JSON);
    if (typeof callback === 'function') callback(output);
    return;
  }

  // https://developers.google.com/apps-script/guides/web#request_parameters

  const method = e.contentLength === -1 ? 'GET' : 'POST';

  const options = {
    hostname: 'localhost',
    path: (e.pathInfo || '/') + (e.queryString ? '?' + e.queryString : ''),
    protocol: 'https:',
    method: method,
    debugEvents: opts.debugEvents || false,
  };

  if (method === 'POST') {
    options.headers = {
      'Content-Type': e.postData.type,
      'Content-Length': e.contentLength,
    };
    options.data = e.postData.contents;
  }

  server
    .inject(targetServer, options)
    .then((res) => {
      let text = ContentService.createTextOutput().setMimeType(ContentService.MimeType.TEXT);
      let json = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
      let html = HtmlService.createHtmlOutput();

      if (((res.statusCode / 100) | 0) != 2) {
        err.error.code = res.statusCode;
        err.error.message = res.payload;
        let output = ContentService.createTextOutput()
          .setContent(JSON.stringify(err))
          .setMimeType(ContentService.MimeType.JSON);
        if (typeof callback === 'function') callback(output);
      } else {
        const type = res.getHeader('content-type') || '';
        if (type) {
          if (~type.indexOf('application/json')) {
            json.setContent(res.payload);
            if (typeof callback === 'function') callback(json);
          } else if (~type.indexOf('text/html')) {
            html.setContent(res.payload);
            if (typeof callback === 'function') callback(html);
          }
        } else {
          text.setContent(res.payload);
          if (typeof callback === 'function') callback(text);
        }
      }
    })
    .catch((e) => {
      err.error.code = 500;
      err.error.message = e.message;
      let output = ContentService.createTextOutput()
        .setContent(JSON.stringify(err))
        .setMimeType(ContentService.MimeType.JSON);
      if (typeof callback === 'function') callback(output);
    });
};
