// adapted from: https://github.com/rill-js/http

const http = require('@rill/http');
const parseUrl = require('url').parse;

const IncomingMessage = require('./response').IncomingMessage;
const urlToOpts = require('./util').urlToHttpRequestOpts;

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

  return new Promise((resolve) => {
    const incomingMessage = new IncomingMessage({
      url: path,
      serverRequest: {
        // encrypted: protocol === 'https:',
        // remoteAddress: '',
        method: opts.method,
        headers: opts.headers,
        body: opts.data || opts.body,
        server,
      },
    });

    const serverResponse = new http.ServerResponse(incomingMessage);

    serverResponse.once('finish', () => {
      incomingMessage.complete = true;
      incomingMessage.emit('end');

      serverResponse.rawPayload =
        serverResponse._body && serverResponse._body.length
          ? Buffer.concat(serverResponse._body.map((chunk) => Buffer.from(chunk)))
          : Buffer.from('');
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

server.doGet = function () {};
server.doPost = function () {};
