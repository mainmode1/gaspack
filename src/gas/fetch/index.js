const gasFetch = require('./fetch');

const fetch_ = function (url, options) {
  // Support schemaless URIs on the server for parity with the browser.
  // Ex: //github.com/ -> https://github.com/
  if (/^\/\//.test(url)) {
    url = 'https:' + url;
  }
  return gasFetch(url, options);
};

module.exports = exports = fetch_;
exports.fetch = fetch_;
exports.Headers = gasFetch.Headers;
exports.Request = gasFetch.Request;
exports.Response = gasFetch.Response;
