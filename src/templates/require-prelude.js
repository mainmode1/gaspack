/*!gaspack*/ var require = (function () {
  // adapted from https://github.com/browserify/browser-pack

  function outer(cache, entry, modules) {
    var previousRequire = typeof require === 'function' && require;

    function newRequire(name, jumped) {
      // gaspack; load module by url
      if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/gi.test(name)) return newRequire('require-url').requrl(name);

      // gaspack; entry dependencies
      if (entry[name]) return newRequire(entry[name]);

      if (!cache[name]) {
        if (!modules[name]) {
          var currentRequire = typeof require === 'function' && require;
          if (!jumped && currentRequire) return currentRequire(name, true);
          if (previousRequire) return previousRequire(name, true);
          throw Error('module not found: ' + name);
        }
        var m = (cache[name] = { exports: {} });
        modules[name][1].call(
          m.exports,
          m.exports,
          function (x) {
            var id = modules[name][0][x];
            return newRequire(id ? id : x);
          },
          m,
          outer,
          cache,
          entry,
          modules,
        );
      }

      // gaspack; interop check for transpiled ES modules
      return cache[name].exports.__esModule && 'default' in cache[name].exports
        ? cache[name].exports['default']
        : cache[name].exports;
    }

    return newRequire;
  }
  return outer;
})();
