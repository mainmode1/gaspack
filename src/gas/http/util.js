// https://nodejs.org/api/http.html#http_http_request_options_callback

function urlToHttpRequestOpts(url) {
  const options = {
    protocol: url.protocol,
    hostname:
      typeof url.hostname === 'string' && url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname,
    host: url.host,
    hash: url.hash,
    search: url.search,
    pathname: url.pathname,
    href: url.href,
    path: `${url.pathname || ''}${url.search || ''}`,
  };

  if (typeof url.port === 'string' && url.port.length !== 0) {
    options.port = Number(url.port);
  }

  if (url.username || url.password) {
    options.auth = `${url.username || ''}:${url.password || ''}`;
  }

  return options;
}

module.exports = { urlToHttpRequestOpts };
