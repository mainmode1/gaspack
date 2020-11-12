const http = require('@rill/http');
const parseUrl = require('url').parse;

const IncomingMessage = require('./message').IncomingMessage;
const urlToOpts = require('./util').urlToHttpRequestOpts;

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

function inject(targetServer, url, opts = {}) {
  if (!targetServer || !(targetServer instanceof http.Server))
    throw Error('target server obj is not instance of http.Server');

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

    if (opts.debugServer) _debugEvent(targetServer, 'Server');

    // queue request
    process.nextTick(() => {
      targetServer.emit('request', request, response);
    });

    if (request.isPaused()) request.resume();
  });
}

const missing = /*prettier-ignore*/ r=>{throw Error(`${r} parameter required`)};

function webapp(e = missing('webapp event obj'), targetServer, opts = {}) {
  //
  // see https://github.com/tanaikech/taking-advantage-of-Web-Apps-with-google-apps-script
  //

  let text = ContentService.createTextOutput().setMimeType(ContentService.MimeType.TEXT);
  let json = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  let html = HtmlService.createHtmlOutput();
  let content = text.setContent('');

  const err = {
    // https://google.github.io/styleguide/jsoncstyleguide.xml
    error: {
      code: undefined,
      message: undefined,
    },
  };

  // make sync
  (async () => {
    try {
      if (!targetServer || !(targetServer instanceof http.Server))
        throw Error('target server obj is not instance of http.Server');

      // https://developers.google.com/apps-script/guides/web#request_parameters

      const method = e.contentLength === -1 ? 'GET' : 'POST';

      const options = {
        hostname: 'localhost',
        path: ('/' + e.pathInfo || '') + (e.queryString ? '?' + e.queryString : ''),
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

      const res = await inject(targetServer, options);

      if (((res.statusCode / 100) | 0) != 2) {
        err.error.code = res.statusCode;
        err.error.message = res.payload;
        content = json.setContent(JSON.stringify(err));
      } else {
        const type = res.getHeader('content-type') || '';

        // https://developers.google.com/apps-script/reference/content/text-output#setMimeType(MimeType)
        // ContentService.MimeType
        //  ATOM
        //  CSV
        //  ICAL
        //  JAVASCRIPT
        //  JSON
        //  RSS
        //  TEXT
        //  VCARD
        //  XML

        //TODO https://developers.google.com/apps-script/reference/content/text-output#downloadAsFile(String)

        if (type) {
          if (~type.indexOf('application/json')) {
            content = json.setContent(res.payload);
          } else if (~type.indexOf('text/html')) {
            content = html.setContent(res.payload);
          }
        } else {
          content = text.setContent(res.payload);
        }
      }
    } catch (e) {
      err.error.code = 500;
      err.error.message = e.message;
      content = json.setContent(JSON.stringify(err));
    }
  })();

  // likely final (return'ed) call in doGet()/doPost() event loop and may miss injected process.exit()
  process.tick();

  return content;
}

module.exports = { inject, webapp };
