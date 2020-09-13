// adapted from: https://github.com/browserify/vm-browserify

var indexOf = function (xs, item) {
  if (xs.indexOf) return xs.indexOf(item);
  else
    for (var i = 0; i < xs.length; i++) {
      if (xs[i] === item) return i;
    }
  return -1;
};

var Object_keys = function (obj) {
  if (Object.keys) return Object.keys(obj);
  else {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
  }
};

var forEach = function (xs, fn) {
  if (xs.forEach) return xs.forEach(fn);
  else
    for (var i = 0; i < xs.length; i++) {
      fn(xs[i], i, xs);
    }
};

var defineProp = (function () {
  try {
    Object.defineProperty({}, '_', {});
    return function (obj, name, value) {
      Object.defineProperty(obj, name, {
        writable: true,
        enumerable: false,
        configurable: true,
        value: value,
      });
    };
  } catch (e) {
    return function (obj, name, value) {
      obj[name] = value;
    };
  }
})();

var globals = [
  'Array',
  'Boolean',
  'Date',
  'Error',
  'EvalError',
  'Function',
  'Infinity',
  'JSON',
  'Math',
  'NaN',
  'Number',
  'Object',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'String',
  'SyntaxError',
  'TypeError',
  'URIError',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'undefined',
  'unescape',
];

function Context() {}
Context.prototype = {};

var Script = (exports.Script = function NodeScript(code) {
  if (!(this instanceof Script)) return new Script(code);
  this.code = code;
});

Script.prototype.runInContext = function (context) {
  if (!(context instanceof Context)) {
    throw new TypeError("needs a 'context' argument.");
  }

  var container = {};

  forEach(Object_keys(context), function (key) {
    container[key] = context[key];
  });
  forEach(globals, function (key) {
    if (context[key]) {
      container[key] = context[key];
    }
  });

  var containerKeys = Object_keys(container);

  var res = Function('"use strict";' + this.code).bind(container)();

  forEach(Object_keys(container), function (key) {
    // Avoid copying circular objects like 'top' and 'window' by only
    // updating existing context properties or new properties in the
    // 'container' that were introduced after the "eval".
    if (key in context || indexOf(containerKeys, key) === -1) {
      context[key] = container[key];
    }
  });

  forEach(globals, function (key) {
    if (!(key in context)) {
      defineProp(context, key, container[key]);
    }
  });

  return res;
};

Script.prototype.runInThisContext = function () {
  return eval(this.code);
};

Script.prototype.runInNewContext = function (context) {
  var ctx = Script.createContext(context);
  var res = this.runInContext(ctx);

  if (context) {
    forEach(Object_keys(ctx), function (key) {
      context[key] = ctx[key];
    });
  }

  return res;
};

forEach(Object_keys(Script.prototype), function (name) {
  exports[name] = Script[name] = function (code) {
    var s = Script(code);
    return s[name].apply(s, Array.prototype.slice.call(arguments, 1));
  };
});

exports.isContext = function (context) {
  return context instanceof Context;
};

exports.createScript = function (code) {
  return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
  var copy = new Context();
  if (typeof context === 'object') {
    forEach(Object_keys(context), function (key) {
      copy[key] = context[key];
    });
  }
  return copy;
};
