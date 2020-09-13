const urlParse = require('url-parse');
const url = require('url/');

require('url-search-params-polyfill');

exports.parse = urlParse_;
exports.URL = urlParse_;
exports.format = url.format;
exports.resolve = url.resolve;

function urlParse_(address, location, parser) {
  if (!(this instanceof urlParse_)) {
    return new urlParse_(address, location, parser);
  }

  if ('object' !== typeof location && 'string' !== typeof location) {
    parser = location;
    location = null;
  }

  if (parser && 'function' !== typeof parser) parser = urlParse.qs;

  const parsed = urlParse(address, location, false);

  parsed.set('search', parsed.query); // https://nodejs.org/api/url.html#url_urlobject_search
  parsed.set('path', parsed.pathname + parsed.search); // https://nodejs.org/api/url.html#url_urlobject_path
  parsed.set('searchParams', new URLSearchParams(parsed.search)); // https://nodejs.org/api/url.html#url_url_searchparams

  if (parser) parsed.set('query', parsed.query, 'function' === typeof parser ? parser : false);

  return parsed;
}
