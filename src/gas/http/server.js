// adapted from: https://github.com/rill-js/http

const http = require('@rill/http');
const parseUrl = require('url').parse;

const IncomingMessage = require('./response').IncomingMessage;

const missing = /*prettier-ignore*/ r=>{throw Error(`${r} parameter required`)};

const server = (module.exports = {});

server.Server = http.Server;
server.IncomingMessage = http.IncomingMessage;
server.ServerResponse = http.ServerResponse;

server.ServerResponse.prototype.assignSocket = function () {};
server.ServerResponse.prototype._header = '';

server.create = function (opts, requestListener) {
  if (typeof opts === 'function') requestListener = opts;
  return http.createServer({}, requestListener);
};

server.request = function (server = missing('server'), url, opts) {
  if (typeof url === 'string') {
    (opts = opts || {}), (opts.parsed = parseUrl(url));
  } else {
    opts = url || {};
  }
  opts.parsed = opts.parsed || {};

  const protocol = opts.protocol || opts.parsed.protocol || 'http:';
  const port = opts.port || opts.parsed.port || opts.defaultPort; // || protocol === 'https:' ? 443 : 80;
  const path = opts.path || opts.parsed.path || '/';
  const host = opts.hostname || opts.parsed.hostname || opts.host; // || 'localhost';

  // may be relative url
  opts.url = (host ? protocol + '//' + host : '') + (port ? ':' + port : '') + path;

  opts.method = (opts.method || 'GET').toUpperCase();
  opts.headers = opts.headers || {};

  return new Promise((resolve) => {
    const incomingMessage = new IncomingMessage({
      url: path,
      serverRequest: {
        // encrypted: protocol === 'https:',
        // remoteAddress: '',
        server,
        method: opts.method,
        headers: opts.headers,
        body: opts.data || opts.body,
      },
    });

    const serverResponse = new http.ServerResponse(incomingMessage);

    serverResponse.once('finish', () => {
      incomingMessage.complete = true;
      incomingMessage.emit('end');

      serverResponse.rawPayload = Buffer.concat(serverResponse._body.map((chunk) => Buffer.from(chunk)));
      serverResponse.payload = serverResponse.rawPayload.toString();

      // new Response(...res.data) when paired with the fetch API
      // serverResponse.data = {
      //   body: Utilities.newBlob(serverResponse.rawPayload, serverResponse.getHeader('content-type') || ''),
      //   res: {
      //     headers: serverResponse.getHeaders(),
      //     status: serverResponse.statusCode,
      //     statusText: serverResponse.statusMessage,
      //     url: incomingMessage.url,
      //   },
      // };

      return resolve(serverResponse);
    });

    setTimeout(server.emit.bind(server, 'request', incomingMessage, serverResponse), 0);
  });
};

// https://developers.google.com/apps-script/guides/web#request_parameters

// e.queryString name=alice&n=1&n=2
// e.pathInfo
// e.contentLength (-1 for GET)
// e.postData.type MIME type of the POST body
// e.postData.contents text of the POST body

//TODO
