function wrap(fn) {
  if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
  return (...args) => expCall(fn, ...args);
}

function expCall(...args) {
  if (!args.length) return undefined;
  const fn = args.shift();
  if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
  const wrapped = () => fn(...args);
  return expBackoff(wrapped).result;
}

function expProfile(...args) {
  if (!args.length) return undefined;
  const fn = args.shift();
  if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
  const wrapped = () => fn(...args);
  return expBackoff(wrapped);
}

function expBackoff(fn, delay, retries, attempt, elapsed) {
  if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
  delay = Math.abs(delay || 750);
  retries = Math.abs(retries || 5);
  attempt = Math.abs(attempt || 1);
  elapsed = elapsed || 0;
  const start = new Date().getTime();
  try {
    const result = profile(fn).call();
    result.elapsed += elapsed;
    result.attempts = attempt;
    return result;
  } catch (e) {
    if (attempt >= retries) {
      throw e;
    } else {
      Utilities.sleep(Math.pow(2, attempt) * delay + Math.round(Math.random() * delay));
      return expBackoff(fn, delay, retries, attempt + 1, elapsed + (new Date().getTime() - start));
    }
  }
}

function profile(fn, name = '') {
  if ('function' !== typeof fn) throw TypeError(fn + 'is not a function');
  return (...args) => {
    const timed = { name, start: new Date().getTime() };
    timed.result = fn(...args);
    timed.finish = new Date().getTime();
    timed.elapsed = timed.finish - timed.start;
    return timed;
  };
}

module.exports = { wrap, expCall, expProfile, expBackoff, profile };
