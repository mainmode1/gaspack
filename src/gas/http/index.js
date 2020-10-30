// adapted from: https://github.com/jhiesey/stream-http & https://github.com/rill-js/http

const statusCodes = require('builtin-status-codes');

const client = require('./client');
const server = require('./server');

const http = (module.exports = {});

http.IncomingMessage = require('./message').IncomingMessage;

http.request = client.request;
http.get = client.get;
http.ClientRequest = client.ClientRequest;

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;
http.globalAgent = new http.Agent();

http.Server = server.Server;
http.ServerResponse = server.ServerResponse;
http.createServer = server.create;

// custom GAS functions for request injection & handling doGet()/doPost() events
http.serverInject = server.inject;
http.handleWebAppEvent = server.handleWebAppEvent;

http.STATUS_CODES = statusCodes;

http.METHODS = [
  'CHECKOUT',
  'CONNECT',
  'COPY',
  'DELETE',
  'GET',
  'HEAD',
  'LOCK',
  'M-SEARCH',
  'MERGE',
  'MKACTIVITY',
  'MKCOL',
  'MOVE',
  'NOTIFY',
  'OPTIONS',
  'PATCH',
  'POST',
  'PROPFIND',
  'PROPPATCH',
  'PURGE',
  'PUT',
  'REPORT',
  'SEARCH',
  'SUBSCRIBE',
  'TRACE',
  'UNLOCK',
  'UNSUBSCRIBE',
];
