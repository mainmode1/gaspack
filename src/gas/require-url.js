const vm = require('vm');

const urlFetch = require('./backoff').wrap(eval('UrlFetch' + 'App').fetch);

const has = (src, p) => Object.prototype.hasOwnProperty.call(src, p);
const missing = /*prettier-ignore*/ r=>{throw Error(`${r} parameter required`)};

// credit @pilbot
const LargeCache_ = (cache, chunkSize) => {
  chunkSize = chunkSize || 1024 * 90; // 90KB max 100KB
  return {
    put: (key, value, timeout) => {
      timeout = timeout || 18000; // 5 hrs
      var json = JSON.stringify(value);
      var cSize = Math.floor(chunkSize / 2);
      var chunks = [];
      var index = 0;
      while (index < json.length) {
        var cKey = key + '_' + index;
        chunks.push(cKey);
        cache.put(cKey, json.substr(index, cSize), timeout + 5);
        index += cSize;
      }
      var superBlk = {
        chunkSize: chunkSize,
        chunks: chunks,
        length: json.length,
      };
      cache.put(key, JSON.stringify(superBlk), timeout);
    },
    get: (key) => {
      var superBlkCache = cache.get(key);
      if (superBlkCache != null) {
        var superBlk = JSON.parse(superBlkCache);
        var chunks = superBlk.chunks.map((cKey) => cache.get(cKey));
        if (chunks.every((c) => c != null)) {
          return JSON.parse(chunks.join(''));
        }
      } else {
        return null;
      }
    },
    remove: (key) => {
      var superBlkCache = cache.get(key);
      if (superBlkCache != null) {
        var superBlk = JSON.parse(superBlkCache);
        superBlk.chunks.map((cKey) => cache.remove(cKey));
        cache.remove(key);
      }
    },
  };
};

function getCachedContent_(url = '', { RECACHE } = {}) {
  const hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, url));
  const cache = LargeCache_(CacheService.getScriptCache());
  if (RECACHE) cache.remove(hash);
  let content = cache.get(hash) || null;
  if (!content) {
    var fetchUrl = urlFetch(url, { muteHttpExceptions: true });
    content = fetchUrl.getContentText();
    if (cache) cache.put(hash, content);
  }
  if (content && content.length) return content;
  throw Error(`empty content: ${url}`);
}

const runCjsModule_ = (code, context, inject = '') => {
  code = `${inject};
    var module,exports;module={exports:(exports={})};
    ${code};
    return module.exports.__esModule&&"default"in module.exports?module.exports.default:module.exports;`;

  return vm.runInNewContext(code, context);
};

function evalUrl_(url = '', { RECACHE, context } = {}) {
  let isGlobalContext = 'object' === typeof context && Object === context.Object;
  let inject = isGlobalContext && 'var self=this,window=this,global=this;';
  let code = getCachedContent_(url, { RECACHE });
  return runCjsModule_(code, context, inject);
}

function urlmodule(name = missing('name'), url = missing('url'), { RECACHE = false, anchor = {}, context = {} } = {}) {
  if (!!anchor && anchor.constructor === Object) throw Error('anchor is not an object literal');
  if (!!context && context.constructor === Object) throw Error('context is not an object literal');
  let newContext = evalUrl_(url, { RECACHE, context });
  // copy newContext to anchor
  (function (src, n, tgt) {
    tgt[n] = tgt[n] || {};
    if (src && 'object' == typeof src) for (let p in src) has(src, p) && (tgt[n][p] = src[p]);
    else tgt[n] = src;
  }.call(null, newContext, name, anchor));
  return anchor;
}

function requrl(url = missing('url'), { RECACHE = false, context = {} } = {}) {
  if (!context || 'object' !== typeof context) throw Error('context is not an object');
  return evalUrl_(url, { RECACHE, context });
}

module.exports = { urlmodule, requrl };
