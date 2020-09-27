// adapted from: https://github.com/jhiesey/stream-http

const parseUrl = require('url').parse;

const ClientRequest = require('./request');
const urlToOpts = require('./util').urlToHttpRequestOpts;

const client = (module.exports = {});

// https://nodejs.org/api/http.html#http_http_request_options_callback
client.request = function (url, opts = {}, cb) {
  if (url && typeof url === 'string') {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    opts = Object.assign(opts, urlToOpts(parseUrl(url)));
  } else if (typeof opts === 'function') {
    cb = opts;
    opts = url || {};
  }

  const protocol = opts.protocol || 'http:';
  const port = opts.port || opts.defaultPort; // || protocol === 'https:' ? 443 : 80;
  const path = opts.path || '/';
  const host = opts.hostname || opts.host; // || 'localhost';

  // may be relative url
  opts.url = (host ? protocol + '//' + host : '') + (port ? ':' + port : '') + path;

  opts.method = (opts.method || 'GET').toUpperCase();
  opts.headers = opts.headers || {};

  const req = new ClientRequest(opts);

  if (cb) req.on('response', cb);

  return req;
};

client.get = function get(url, opts, cb) {
  if (typeof url === 'string') {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
  } else if (typeof opts === 'function') {
    cb = opts;
    opts = url || {};
    url = null;
  }
  opts.method = 'GET';
  const req = client.request(url, opts, cb);
  req.end();
  return req;
};

client.ClientRequest = ClientRequest;
