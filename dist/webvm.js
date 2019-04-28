(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.webvm = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":2,"timers":1}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function (setImmediate){
'use strict';

/**
 * @this {Promise}
 */
function finallyConstructor(callback) {
  var constructor = this.constructor;
  return this.then(
    function(value) {
      return constructor.resolve(callback()).then(function() {
        return value;
      });
    },
    function(reason) {
      return constructor.resolve(callback()).then(function() {
        return constructor.reject(reason);
      });
    }
  );
}

// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;

function noop() {}

// Polyfill for Function.prototype.bind
function bind(fn, thisArg) {
  return function() {
    fn.apply(thisArg, arguments);
  };
}

/**
 * @constructor
 * @param {Function} fn
 */
function Promise(fn) {
  if (!(this instanceof Promise))
    throw new TypeError('Promises must be constructed via new');
  if (typeof fn !== 'function') throw new TypeError('not a function');
  /** @type {!number} */
  this._state = 0;
  /** @type {!boolean} */
  this._handled = false;
  /** @type {Promise|undefined} */
  this._value = undefined;
  /** @type {!Array<!Function>} */
  this._deferreds = [];

  doResolve(fn, this);
}

function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (self._state === 0) {
    self._deferreds.push(deferred);
    return;
  }
  self._handled = true;
  Promise._immediateFn(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
      return;
    }
    var ret;
    try {
      ret = cb(self._value);
    } catch (e) {
      reject(deferred.promise, e);
      return;
    }
    resolve(deferred.promise, ret);
  });
}

function resolve(self, newValue) {
  try {
    // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    if (newValue === self)
      throw new TypeError('A promise cannot be resolved with itself.');
    if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
    ) {
      var then = newValue.then;
      if (newValue instanceof Promise) {
        self._state = 3;
        self._value = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(bind(then, newValue), self);
        return;
      }
    }
    self._state = 1;
    self._value = newValue;
    finale(self);
  } catch (e) {
    reject(self, e);
  }
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  finale(self);
}

function finale(self) {
  if (self._state === 2 && self._deferreds.length === 0) {
    Promise._immediateFn(function() {
      if (!self._handled) {
        Promise._unhandledRejectionFn(self._value);
      }
    });
  }

  for (var i = 0, len = self._deferreds.length; i < len; i++) {
    handle(self, self._deferreds[i]);
  }
  self._deferreds = null;
}

/**
 * @constructor
 */
function Handler(onFulfilled, onRejected, promise) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
  var done = false;
  try {
    fn(
      function(value) {
        if (done) return;
        done = true;
        resolve(self, value);
      },
      function(reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      }
    );
  } catch (ex) {
    if (done) return;
    done = true;
    reject(self, ex);
  }
}

Promise.prototype['catch'] = function(onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  // @ts-ignore
  var prom = new this.constructor(noop);

  handle(this, new Handler(onFulfilled, onRejected, prom));
  return prom;
};

Promise.prototype['finally'] = finallyConstructor;

Promise.all = function(arr) {
  return new Promise(function(resolve, reject) {
    if (!arr || typeof arr.length === 'undefined')
      throw new TypeError('Promise.all accepts an array');
    var args = Array.prototype.slice.call(arr);
    if (args.length === 0) return resolve([]);
    var remaining = args.length;

    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(
              val,
              function(val) {
                res(i, val);
              },
              reject
            );
            return;
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex);
      }
    }

    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.resolve = function(value) {
  if (value && typeof value === 'object' && value.constructor === Promise) {
    return value;
  }

  return new Promise(function(resolve) {
    resolve(value);
  });
};

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
};

Promise.race = function(values) {
  return new Promise(function(resolve, reject) {
    for (var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve, reject);
    }
  });
};

// Use polyfill for setImmediate for performance gains
Promise._immediateFn =
  (typeof setImmediate === 'function' &&
    function(fn) {
      setImmediate(fn);
    }) ||
  function(fn) {
    setTimeoutFunc(fn, 0);
  };

Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
  if (typeof console !== 'undefined' && console) {
    console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
  }
};

module.exports = Promise;

}).call(this,require("timers").setImmediate)

},{"timers":1}],4:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.WHATWGFetch = {})));
}(this, (function (exports) { 'use strict';

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob:
      'FileReader' in self &&
      'Blob' in self &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  exports.DOMException = self.DOMException;
  try {
    new exports.DOMException();
  } catch (err) {
    exports.DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    exports.DOMException.prototype = Object.create(Error.prototype);
    exports.DOMException.prototype.constructor = exports.DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new exports.DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.onabort = function() {
        reject(new exports.DOMException('Aborted', 'AbortError'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!self.fetch) {
    self.fetch = fetch;
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
  }

  exports.Headers = Headers;
  exports.Request = Request;
  exports.Response = Response;
  exports.fetch = fetch;

  Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rafPolyfill = require("./raf-polyfill");
class AnimationQueue {
    constructor() {
        this.skip = false;
        this.binded = false;
        this.requestAnimationID = -1;
        this.frames = new Array();
        this.bindCycle = this.cycle.bind(this);
        this.rafProvider = rafPolyfill.GetRAF();
    }
    new() {
        const newFrame = new AFrame(this.frames.length, this);
        this.frames.push(newFrame);
        return newFrame;
    }
    add(f) {
        f.queueIndex = this.frames.length;
        f.queue = this;
        this.frames.push(f);
    }
    resume() {
        this.skip = false;
    }
    pause() {
        this.skip = true;
    }
    unbind() {
        if (!this.binded) {
            return null;
        }
        this.rafProvider.cancelAnimationFrame(this.requestAnimationID);
    }
    bind() {
        if (this.binded)
            return null;
        this.requestAnimationID = this.rafProvider.requestAnimationFrame(this.bindCycle, null);
        this.binded = true;
    }
    cycle(ms) {
        if (this.frames.length === 0) {
            this.binded = false;
            return;
        }
        this.frames.forEach(function (f) {
            if (!f.paused()) {
                f.animate(ms);
            }
        });
        this.bind();
    }
}
exports.AnimationQueue = AnimationQueue;
class AFrame {
    constructor(index, queue) {
        this.skip = false;
        this.queue = queue;
        this.queueIndex = index;
        this.callbacks = new Array();
    }
    add(callback) {
        this.callbacks.push(callback);
    }
    clear() {
        this.callbacks.length = 0;
    }
    paused() {
        return this.skip;
    }
    pause() {
        this.skip = true;
    }
    stop() {
        this.pause();
        if (this.queueIndex === -1) {
            return null;
        }
        if (this.queue.frames.length == 0) {
            this.queue = undefined;
            this.queueIndex = -1;
            return null;
        }
        const total = this.queue.frames.length;
        if (total == 1) {
            this.queue.frames.pop();
            this.queue = undefined;
            this.queueIndex = -1;
            return null;
        }
        this.queue.frames[this.queueIndex] = this.queue.frames[total - 1];
        this.queue.frames.length = total - 1;
        this.queue = undefined;
        this.queueIndex = -1;
    }
    animate(ts) {
        for (let index in this.callbacks) {
            const callback = this.callbacks[index];
            callback(ts);
        }
    }
}
exports.AFrame = AFrame;
class ChangeManager {
    static drainTasks(q, wrapper) {
        let task = q.shift();
        while (task) {
            if (wrapper !== null) {
                wrapper(task);
                task = q.shift();
                continue;
            }
            task();
            task = q.shift();
        }
    }
    constructor(queue) {
        this.reads = new Array();
        this.writes = new Array();
        this.readState = false;
        this.inReadCall = false;
        this.inWriteCall = false;
        this.scheduled = false;
        this.frame = queue.new();
    }
    mutate(fn) {
        this.writes.push(fn);
        this._schedule();
    }
    read(fn) {
        this.reads.push(fn);
        this._schedule();
    }
    _schedule() {
        if (this.scheduled) {
            return;
        }
        this.scheduled = true;
        this.frame.add(this._runTasks.bind(this));
    }
    _runTasks() {
        const readError = this._runReads();
        if (readError !== null && readError !== undefined) {
            this.scheduled = false;
            this._schedule();
            throw readError;
        }
        const writeError = this._runWrites();
        if (writeError !== null && writeError !== undefined) {
            this.scheduled = false;
            this._schedule();
            throw writeError;
        }
        if (this.reads.length > 0 || this.writes.length > 0) {
            this.scheduled = false;
            this._schedule();
            return;
        }
        this.scheduled = false;
    }
    _runReads() {
        try {
            ChangeManager.drainTasks(this.reads, this._execReads.bind(this));
        }
        catch (e) {
            return e;
        }
        return null;
    }
    _execReads(task) {
        this.inReadCall = true;
        task();
        this.inReadCall = false;
    }
    _runWrites() {
        try {
            ChangeManager.drainTasks(this.writes, this._execWrite.bind(this));
        }
        catch (e) {
            return e;
        }
        return null;
    }
    _execWrite(task) {
        this.inWriteCall = true;
        task();
        this.inWriteCall = false;
    }
}

},{"./raf-polyfill":14}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const exts = require("./extensions");
exports.ELEMENT_NODE = 1;
exports.DOCUMENT_FRAGMENT_NODE = 11;
exports.DOCUMENT_NODE = 9;
exports.TEXT_NODE = 3;
exports.COMMENT_NODE = 8;
const attributes = utils_1.createMap();
attributes['style'] = applyStyle;
function isDocumentRoot(node) {
    return node.nodeType === 11 || node.nodeType === 9;
}
exports.isDocumentRoot = isDocumentRoot;
function isElement(node) {
    return node.nodeType === 1;
}
exports.isElement = isElement;
function isText(node) {
    return node.nodeType === 3;
}
exports.isText = isText;
function getAncestry(node, root) {
    const ancestry = [];
    let cur = node;
    while (cur !== root) {
        const n = cur;
        ancestry.push(n);
        cur = n.parentNode;
    }
    return ancestry;
}
exports.getAncestry = getAncestry;
const getRootNode = Node.prototype.getRootNode ||
    function () {
        let cur = this;
        let prev = cur;
        while (cur) {
            prev = cur;
            cur = cur.parentNode;
        }
        return prev;
    };
function reverseCollectNodeWithBreadth(parent, matcher, matches) {
    let cur = parent.lastChild;
    while (cur) {
        if (matcher(cur)) {
            matches.push(cur);
        }
        cur = cur.previousSibling;
    }
}
exports.reverseCollectNodeWithBreadth = reverseCollectNodeWithBreadth;
function reverseFindNodeWithBreadth(parent, matcher) {
    let cur = parent.lastChild;
    while (cur) {
        if (matcher(cur)) {
            return cur;
        }
        cur = cur.previousSibling;
    }
    return null;
}
exports.reverseFindNodeWithBreadth = reverseFindNodeWithBreadth;
function collectNodeWithBreadth(parent, matcher, matches) {
    let cur = parent.firstChild;
    if (matcher(cur)) {
        matches.push(cur);
    }
    while (cur) {
        if (matcher(cur.nextSibling)) {
            matches.push(cur);
        }
        cur = cur.nextSibling;
    }
}
exports.collectNodeWithBreadth = collectNodeWithBreadth;
function collectNodeWithDepth(parent, matcher, matches) {
    let cur = parent.firstChild;
    while (cur) {
        if (matcher(cur)) {
            matches.push(cur);
        }
        cur = cur.firstChild;
    }
}
exports.collectNodeWithDepth = collectNodeWithDepth;
function findNodeWithBreadth(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        if (matcher(cur)) {
            return cur;
        }
        cur = cur.nextSibling;
    }
    return null;
}
exports.findNodeWithBreadth = findNodeWithBreadth;
function findNodeWithDepth(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        if (matcher(cur)) {
            return cur;
        }
        cur = cur.firstChild;
    }
    return null;
}
exports.findNodeWithDepth = findNodeWithDepth;
function findDepthFirst(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        const found = findNodeWithDepth(cur, matcher);
        if (found) {
            return found;
        }
        cur = cur.nextSibling;
    }
    return null;
}
exports.findDepthFirst = findDepthFirst;
function collectDepthFirst(parent, matcher, matches) {
    let cur = parent.firstChild;
    while (cur) {
        collectNodeWithDepth(cur, matcher, matches);
        cur = cur.nextSibling;
    }
    return;
}
exports.collectDepthFirst = collectDepthFirst;
function findBreadthFirst(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        const found = findNodeWithBreadth(cur, matcher);
        if (found) {
            return found;
        }
        cur = cur.firstChild;
    }
    return null;
}
exports.findBreadthFirst = findBreadthFirst;
function applyEachNode(parent, fn) {
    fn(parent);
    let cur = parent.firstChild;
    while (cur) {
        applyEachNode(cur.nextSibling, fn);
        cur = cur.nextSibling;
    }
}
exports.applyEachNode = applyEachNode;
function reverseApplyEachNode(parent, fn) {
    let cur = parent.lastChild;
    while (cur) {
        reverseApplyEachNode(cur, fn);
        cur = cur.previousSibling;
    }
    fn(parent);
}
exports.reverseApplyEachNode = reverseApplyEachNode;
function collectBreadthFirst(parent, matcher, matches) {
    let cur = parent.firstChild;
    while (cur) {
        collectNodeWithBreadth(cur, matcher, matches);
        cur = cur.firstChild;
    }
    return;
}
exports.collectBreadthFirst = collectBreadthFirst;
function getActiveElement(node) {
    const root = getRootNode.call(node);
    return isDocumentRoot(root) ? root.activeElement : null;
}
exports.getActiveElement = getActiveElement;
function getFocusedPath(node, root) {
    const activeElement = getActiveElement(node);
    if (!activeElement || !node.contains(activeElement)) {
        return [];
    }
    return getAncestry(activeElement, root);
}
exports.getFocusedPath = getFocusedPath;
function moveBefore(parentNode, node, referenceNode) {
    const insertReferenceNode = node.nextSibling;
    let cur = referenceNode;
    while (cur !== null && cur !== node) {
        const next = cur.nextSibling;
        parentNode.insertBefore(cur, insertReferenceNode);
        cur = next;
    }
}
exports.moveBefore = moveBefore;
function insertBefore(parentNode, node, referenceNode) {
    if (referenceNode === null) {
        parentNode.appendChild(node);
        return null;
    }
    parentNode.insertBefore(node, referenceNode);
    return null;
}
exports.insertBefore = insertBefore;
function replaceNode(parentNode, node, replacement) {
    if (replacement === null) {
        return null;
    }
    parentNode.replaceChild(replacement, node);
    return null;
}
exports.replaceNode = replaceNode;
function replaceNodeIf(targetNode, replacement) {
    if (replacement === null) {
        return false;
    }
    const parent = targetNode.parentNode;
    if (!parent) {
        return false;
    }
    parent.replaceChild(replacement, targetNode);
    return true;
}
exports.replaceNodeIf = replaceNodeIf;
function getNamespace(name) {
    if (name.lastIndexOf('xml:', 0) === 0) {
        return 'http://www.w3.org/XML/1998/namespace';
    }
    if (name.lastIndexOf('xlink:', 0) === 0) {
        return 'http://www.w3.org/1999/xlink';
    }
    return undefined;
}
exports.getNamespace = getNamespace;
function applyAttr(el, name, value) {
    if (value == null) {
        el.removeAttribute(name);
    }
    else {
        const attrNS = getNamespace(name);
        if (attrNS) {
            el.setAttributeNS(attrNS, name, String(value));
        }
        else {
            el.setAttribute(name, String(value));
        }
    }
}
exports.applyAttr = applyAttr;
function applyAttrs(el, values) {
    for (let key in values) {
        if (values[key] == null) {
            el.removeAttribute(key);
            continue;
        }
        el.setAttribute(key, values[key]);
    }
}
exports.applyAttrs = applyAttrs;
function applyProp(el, name, value) {
    el[name] = value;
}
exports.applyProp = applyProp;
function setStyleValue(style, prop, value) {
    if (prop.indexOf('-') >= 0) {
        style.setProperty(prop, value);
    }
    else {
        style[prop] = value;
    }
}
exports.setStyleValue = setStyleValue;
function applySVGStyle(el, name, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applySVGStyle = applySVGStyle;
function applyStyle(el, name, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applyStyle = applyStyle;
function applyStyles(el, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applyStyles = applyStyles;
function applySVGStyles(el, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applySVGStyles = applySVGStyles;
function applyAttributeTyped(el, name, value) {
    const type = typeof value;
    if (type === 'object' || type === 'function') {
        applyProp(el, name, value);
    }
    else {
        applyAttr(el, name, value);
    }
}
exports.applyAttributeTyped = applyAttributeTyped;
function getNamespaceForTag(tag, parent) {
    if (tag === 'svg') {
        return 'http://www.w3.org/2000/svg';
    }
    if (tag === 'math') {
        return 'http://www.w3.org/1998/Math/MathML';
    }
    if (parent == null) {
        return null;
    }
    return parent.namespaceURI;
}
exports.getNamespaceForTag = getNamespaceForTag;
function recordAttributes(node) {
    const attrs = {};
    const attributes = node.attributes;
    const length = attributes.length;
    if (!length) {
        return attrs;
    }
    for (let i = 0, j = 0; i < length; i += 1, j += 2) {
        const attr = attributes[i];
        attrs[attr.name] = attr.value;
    }
    return attrs;
}
exports.recordAttributes = recordAttributes;
function createElement(doc, nameOrCtor, key, content, attributes, namespace) {
    let el;
    if (typeof nameOrCtor === 'function') {
        el = new nameOrCtor();
        return el;
    }
    namespace = namespace.trim();
    if (namespace.length > 0) {
        switch (nameOrCtor) {
            case 'svg':
                el = doc.createElementNS('http://www.w3.org/2000/svg', nameOrCtor);
                break;
            case 'math':
                el = doc.createElementNS('http://www.w3.org/1998/Math/MathML', nameOrCtor);
                break;
            default:
                el = doc.createElementNS(namespace, nameOrCtor);
        }
    }
    else {
        el = doc.createElement(nameOrCtor);
    }
    el.setAttribute('_key', key);
    if (attributes) {
        applyAttrs(el, attributes);
    }
    if (content.length > 0) {
        el.innerHTML = content;
    }
    return el;
}
exports.createElement = createElement;
function createText(doc, text, key) {
    const node = doc.createTextNode(text);
    exts.Objects.PatchWith(node, 'key', key);
    return node;
}
exports.createText = createText;
function removeFromNode(fromNode, endNode) {
    const parentNode = fromNode.parentNode;
    let child = fromNode;
    while (child !== endNode) {
        const next = child.nextSibling;
        parentNode.removeChild(child);
        child = next;
    }
}
exports.removeFromNode = removeFromNode;

},{"./extensions":7,"./utils":16}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Objects;
(function (Objects) {
    function PatchWith(elem, attrName, attrs) {
        elem[attrName] = attrs;
    }
    Objects.PatchWith = PatchWith;
    function GetAttrWith(elem, attrName) {
        return elem[attrName];
    }
    Objects.GetAttrWith = GetAttrWith;
    function isNullOrUndefined(elem) {
        return elem === null || elem === undefined;
    }
    Objects.isNullOrUndefined = isNullOrUndefined;
    function isAny(elem, ...values) {
        for (let index of values) {
            if (elem === index) {
                return true;
            }
        }
        return false;
    }
    Objects.isAny = isAny;
})(Objects = exports.Objects || (exports.Objects = {}));

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch = require("whatwg-fetch");
exports.fetchAPI = {
    fetch: self.fetch,
    Headers: self.Headers,
    Request: self.Request,
    Response: self.Response,
    DOMException: self.DOMException,
};
if (!self.fetch) {
    exports.fetchAPI.fetch = fetch.fetch;
    exports.fetchAPI.Headers = fetch.Headers;
    exports.fetchAPI.Request = fetch.Request;
    exports.fetchAPI.Response = fetch.Response;
    exports.fetchAPI.DOMException = fetch.DOMException;
    self.fetch = fetch.fetch;
    self.Headers = fetch.Headers;
    self.Request = fetch.Request;
    self.Response = fetch.Response;
    self.DOMException = fetch.DOMException;
}

},{"whatwg-fetch":4}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {};

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function LinearSum(p0, p1, t) {
    return (p1 - p0) * t + p0;
}
exports.LinearSum = LinearSum;
function BernsteinDivision(n, i) {
    const fc = FactorialGenerator();
    return fc(n) / fc(i) / fc(n - i);
}
exports.BernsteinDivision = BernsteinDivision;
function FactorialGenerator() {
    const a = [1];
    return function (n) {
        let s = 1;
        if (a[n]) {
            return a[n];
        }
        for (let i = n; i > 1; i--) {
            s *= i;
        }
        a[n] = s;
        return s;
    };
}
exports.FactorialGenerator = FactorialGenerator;
function CatmullRomSum(p0, p1, p2, p3, t) {
    var v0 = (p2 - p0) * 0.5;
    var v1 = (p3 - p1) * 0.5;
    var t2 = t * t;
    var t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}
exports.CatmullRomSum = CatmullRomSum;
function Linear(v, k) {
    const m = v.length - 1;
    const f = m * k;
    const i = Math.floor(f);
    if (k < 0) {
        return LinearSum(v[0], v[1], f);
    }
    if (k > 1) {
        return LinearSum(v[m], v[m - 1], m - f);
    }
    return LinearSum(v[i], v[i + 1 > m ? m : i + 1], f - i);
}
exports.Linear = Linear;
function Bezier(v, k) {
    const n = v.length - 1;
    const pw = Math.pow;
    let b = 0;
    for (let i = 0; i <= n; i++) {
        b += pw(1 - k, n - i) * pw(k, i) * v[i] * BernsteinDivision(n, i);
    }
    return b;
}
exports.Bezier = Bezier;
function CatmullRom(v, k) {
    const m = v.length - 1;
    let f = m * k;
    let i = Math.floor(f);
    if (v[0] === v[m]) {
        if (k < 0) {
            f = m * (1 + k);
            i = Math.floor(f);
        }
        return CatmullRomSum(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);
    }
    if (k < 0) {
        return v[0] - (CatmullRomSum(v[0], v[0], v[1], v[1], -f) - v[0]);
    }
    if (k > 1) {
        return v[m] - (CatmullRomSum(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
    }
    return CatmullRomSum(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);
}
exports.CatmullRom = CatmullRom;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patch = require("./patch");
const dom = require("./dom");
class DOMMount {
    constructor(document, target) {
        this.doc = document;
        this.events = {};
        this.handler = this.handleEvent.bind(this);
        if (typeof target === 'string') {
            const targetSelector = target;
            const node = this.doc.querySelector(targetSelector);
            if (node === null || node === undefined) {
                throw new Error(`unable to locate node for ${{ targetSelector }}`);
            }
            this.mountNode = node;
            return;
        }
        this.mountNode = target;
    }
    handleEvent(event) { }
    patch(change) {
        if (change instanceof DocumentFragment) {
            const fragment = change;
            patch.PatchDOMTree(fragment, this.mountNode, patch.DefaultNodeDictator, false);
            this.registerNodeEvents(fragment);
            return;
        }
        if (typeof change === 'string') {
            const node = document.createElement('div');
            node.innerHTML = change;
            patch.PatchDOMTree(node, this.mountNode, patch.DefaultNodeDictator, false);
            this.registerNodeEvents(node);
            return;
        }
        if (!patch.isJSONNode(change)) {
            return;
        }
        const node = change;
        patch.PatchJSONNodeTree(node, this.mountNode, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
        this.registerJSONNodeEvents(node);
    }
    patchList(changes) {
        changes.forEach(this.patch.bind(this));
    }
    stream(changes) {
        const nodes = JSON.parse(changes);
        return this.streamList(nodes);
    }
    streamList(changes) {
        patch.StreamJSONNodes(changes, this.mountNode, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
        changes.forEach(this.registerJSONNodeEvents.bind(this));
    }
    registerNodeEvents(node) {
        const binder = this;
        dom.applyEachNode(node, function (n) {
            if (n.nodeType !== dom.ELEMENT_NODE) {
                return;
            }
            const elem = node;
            const events = elem.getAttribute('events');
            events.split(' ').forEach(function (desc) {
                const order = desc.split('-');
                if (order.length === 2) {
                    binder.registerEvent(order[0]);
                }
            });
        });
    }
    registerJSONNodeEvents(node) {
        const binder = this;
        patch.applyJSONNodeFunction(node, function (n) {
            if (n.removed) {
                n.events.forEach(function (desc) {
                    binder.unregisterEvent(desc.Name);
                });
                return;
            }
            n.events.forEach(function (desc) {
                binder.registerEvent(desc.Name);
            });
        });
    }
    registerEvent(eventName) {
        if (this.events[eventName]) {
            return;
        }
        this.mountNode.addEventListener(eventName, this.handler, true);
        this.events[eventName] = true;
    }
    unregisterEvent(eventName) {
        if (!this.events[eventName]) {
            return;
        }
        this.mountNode.removeEventListener(eventName, this.handler, true);
        this.events[eventName] = false;
    }
}
exports.DOMMount = DOMMount;

},{"./dom":6,"./patch":12}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dom = require("./dom");
const exts = require("./extensions");
const dom_1 = require("./dom");
exports.DefaultNodeDictator = {
    Same: (n, m) => {
        return n.nodeType == m.nodeType && n.nodeName == m.nodeName;
    },
    Changed: (n, m) => {
        return false;
    },
};
function applyJSONNodeFunction(node, fn) {
    fn(node);
    node.children.forEach(function (child) {
        applyJSONNodeFunction(child, fn);
    });
}
exports.applyJSONNodeFunction = applyJSONNodeFunction;
function applyJSONNodeKidsFunction(node, fn) {
    node.children.forEach(function (child) {
        applyJSONNodeFunction(child, fn);
    });
    fn(node);
}
exports.applyJSONNodeKidsFunction = applyJSONNodeKidsFunction;
function isJSONNode(n) {
    const hasID = typeof n.id !== 'undefined';
    const hasRef = typeof n.ref !== 'undefined';
    const hasTid = typeof n.tid !== 'undefined';
    const hasTypeName = typeof n.typeName !== 'undefined';
    return hasID && hasRef && hasTypeName && hasTid;
}
exports.isJSONNode = isJSONNode;
function findElement(desc, parent) {
    const selector = desc.name + '#' + desc.id;
    const targets = parent.querySelectorAll(selector);
    if (targets.length === 0) {
        let attrSelector = desc.name + `[_tid='${desc.tid}']`;
        let target = parent.querySelector(attrSelector);
        if (target) {
            return target;
        }
        attrSelector = desc.name + `[_atid='${desc.atid}']`;
        target = parent.querySelector(attrSelector);
        if (target) {
            return target;
        }
        attrSelector = desc.name + `[_ref='${desc.ref}']`;
        return parent.querySelector(attrSelector);
    }
    if (targets.length === 1) {
        return targets[0];
    }
    const total = targets.length;
    for (let i = 0; i < total; i++) {
        const elem = targets.item(i);
        if (elem.getAttribute('_tid') === desc.tid) {
            return elem;
        }
        if (elem.getAttribute('_atid') === desc.atid) {
            return elem;
        }
        if (elem.getAttribute('_ref') === desc.ref) {
            return elem;
        }
    }
    return null;
}
exports.findElement = findElement;
function findElementbyRef(ref, parent) {
    const ids = ref.split('/').map(function (elem) {
        if (elem.trim() === '') {
            return '';
        }
        return '#' + elem;
    });
    if (ids.length === 0) {
        return null;
    }
    if (ids[0] === '' || ids[0].trim() === '') {
        ids.shift();
    }
    const first = ids[0];
    if (parent.id == first.substr(1)) {
        ids.shift();
    }
    let cur = parent.querySelector(ids.shift());
    while (cur) {
        if (ids.length === 0) {
            return cur;
        }
        cur = cur.querySelector(ids.shift());
    }
    return cur;
}
exports.findElementbyRef = findElementbyRef;
function findElementParentbyRef(ref, parent) {
    const ids = ref.split('/').map(function (elem) {
        if (elem.trim() === '') {
            return '';
        }
        return '#' + elem;
    });
    if (ids.length === 0) {
        return null;
    }
    if (ids[0] === '' || ids[0].trim() === '') {
        ids.shift();
    }
    ids.pop();
    const first = ids[0];
    if (parent.id == first.substr(1)) {
        ids.shift();
    }
    let cur = parent.querySelector(ids.shift());
    while (cur) {
        if (ids.length === 0) {
            return cur;
        }
        cur = cur.querySelector(ids.shift());
    }
    return cur;
}
exports.findElementParentbyRef = findElementParentbyRef;
exports.DefaultJSONDictator = {
    Same: (n, m) => {
        return false;
    },
    Changed: (n, m) => {
        return false;
    },
};
exports.DefaultJSONMaker = {
    Make: jsonMaker,
};
function jsonMaker(doc, descNode, shallow, skipRemoved) {
    if (descNode.type === dom_1.COMMENT_NODE) {
        const node = doc.createComment(descNode.content);
        exts.Objects.PatchWith(node, '_id', descNode.id);
        exts.Objects.PatchWith(node, '_ref', descNode.ref);
        exts.Objects.PatchWith(node, '_tid', descNode.tid);
        exts.Objects.PatchWith(node, '_atid', descNode.atid);
        return node;
    }
    if (descNode.type === dom_1.TEXT_NODE) {
        const node = doc.createTextNode(descNode.content);
        exts.Objects.PatchWith(node, '_id', descNode.id);
        exts.Objects.PatchWith(node, '_ref', descNode.ref);
        exts.Objects.PatchWith(node, '_tid', descNode.tid);
        exts.Objects.PatchWith(node, '_atid', descNode.atid);
        return node;
    }
    let node;
    if (descNode.namespace.length !== 0) {
        node = doc.createElement(descNode.name);
    }
    else {
        node = doc.createElementNS(descNode.namespace, descNode.name);
    }
    exts.Objects.PatchWith(node, '_id', descNode.id);
    exts.Objects.PatchWith(node, '_ref', descNode.ref);
    exts.Objects.PatchWith(node, '_tid', descNode.tid);
    exts.Objects.PatchWith(node, '_atid', descNode.atid);
    node.setAttribute('id', descNode.id);
    node.setAttribute('_tid', descNode.tid);
    node.setAttribute('_ref', descNode.ref);
    node.setAttribute('_atid', descNode.atid);
    node.setAttribute('events', BuildEvent(descNode.events));
    descNode.attrs.forEach(function attrs(attr) {
        node.setAttribute(attr.Key, attr.Value);
    });
    if (descNode.removed) {
        node.setAttribute('_removed', 'true');
        return node;
    }
    if (!shallow) {
        descNode.children.forEach(function (kidJSON) {
            if (skipRemoved && kidJSON.removed) {
                return;
            }
            node.appendChild(jsonMaker(doc, kidJSON, shallow, skipRemoved));
        });
    }
    return node;
}
exports.jsonMaker = jsonMaker;
function BuildEvent(events) {
    const values = new Array();
    events.forEach(function attrs(attr) {
        const eventName = attr.Name + '-' + (attr.PreventDefault ? '1' : '0') + (attr.StopPropagation ? '1' : '0');
        values.push(eventName);
    });
    return values.join(' ');
}
exports.BuildEvent = BuildEvent;
function PatchJSONNodeTree(fragment, mount, dictator, maker) {
    let targetNode = findElement(fragment, mount);
    if (exts.Objects.isNullOrUndefined(targetNode)) {
        const tNode = maker.Make(document, fragment, false, true);
        mount.appendChild(targetNode);
        return;
    }
    PatchJSONNode(fragment, targetNode, dictator, maker);
}
exports.PatchJSONNodeTree = PatchJSONNodeTree;
function PatchJSONNode(fragment, targetNode, dictator, maker) {
    if (!dictator.Same(targetNode, fragment)) {
        const tNode = maker.Make(document, fragment, false, true);
        dom.replaceNode(targetNode.parentNode, targetNode, tNode);
        return;
    }
    if (!dictator.Changed(targetNode, fragment)) {
        return;
    }
    PatchJSONAttributes(fragment, targetNode);
    const totalKids = targetNode.childNodes.length;
    const fragmentKids = fragment.children.length;
    let i = 0;
    for (; i < totalKids; i++) {
        const childNode = targetNode.childNodes[i];
        if (i >= fragmentKids) {
            childNode.remove();
            continue;
        }
        const childFragment = fragment.children[i];
        PatchJSONNode(childFragment, childNode, dictator, maker);
    }
    for (; i < fragmentKids; i++) {
        const tNode = maker.Make(document, fragment, false, true);
        targetNode.appendChild(tNode);
    }
    return;
}
exports.PatchJSONNode = PatchJSONNode;
function StreamJSONNodes(fragment, mount, dictator, maker) {
    const changes = fragment.filter(function (elem) {
        return !elem.removed;
    });
    fragment
        .filter(function (elem) {
        if (!elem.removed) {
            return false;
        }
        let filtered = true;
        changes.forEach(function (el) {
            if (elem.tid === el.tid || elem.tid == el.atid || elem.ref === el.ref) {
                filtered = false;
            }
        });
        return filtered;
    })
        .forEach(function (removal) {
        const target = findElement(removal, mount);
        if (target) {
            target.remove();
        }
    });
    changes.forEach(function (change) {
        const targetNode = findElement(change, mount);
        if (exts.Objects.isNullOrUndefined(targetNode)) {
            const targetNodeParent = findElementParentbyRef(change.ref, mount);
            if (exts.Objects.isNullOrUndefined(targetNodeParent)) {
                console.log('Unable to apply new change stream: ', change);
                return;
            }
            const tNode = maker.Make(document, change, false, true);
            targetNodeParent.appendChild(tNode);
            return;
        }
        ApplyStreamNode(change, targetNode, dictator, maker);
    });
    return;
}
exports.StreamJSONNodes = StreamJSONNodes;
function ApplyStreamNode(fragment, targetNode, dictator, maker) {
    if (!dictator.Same(targetNode, fragment)) {
        const tNode = maker.Make(document, fragment, false, true);
        dom.replaceNode(targetNode.parentNode, targetNode, tNode);
        return;
    }
    if (dictator.Changed(targetNode, fragment)) {
        PatchJSONAttributes(fragment, targetNode);
    }
    const totalKids = targetNode.childNodes.length;
    const fragmentKids = fragment.children.length;
    let i = 0;
    for (; i < totalKids; i++) {
        const childNode = targetNode.childNodes[i];
        if (i >= fragmentKids) {
            return;
        }
        const childFragment = fragment.children[i];
        PatchJSONNode(childFragment, childNode, dictator, maker);
    }
    for (; i < fragmentKids; i++) {
        const tNode = maker.Make(document, fragment, false, true);
        targetNode.appendChild(tNode);
    }
    return;
}
exports.ApplyStreamNode = ApplyStreamNode;
function PatchTextCommentWithJSON(fragment, target) {
    if (fragment.type !== dom_1.COMMENT_NODE && fragment.type !== dom_1.TEXT_NODE) {
        return;
    }
    if (fragment.type !== dom_1.COMMENT_NODE && fragment.type !== dom_1.TEXT_NODE) {
        return;
    }
    if (target.textContent === fragment.content) {
        return;
    }
    target.textContent = fragment.content;
    exts.Objects.PatchWith(target, '_ref', fragment.ref);
    exts.Objects.PatchWith(target, '_tid', fragment.tid);
    exts.Objects.PatchWith(target, '_atid', fragment.atid);
}
exports.PatchTextCommentWithJSON = PatchTextCommentWithJSON;
function PatchJSONAttributes(node, target) {
    const oldNodeAttrs = dom.recordAttributes(target);
    node.attrs.forEach(function (attr) {
        const oldValue = oldNodeAttrs[attr.Key];
        delete oldNodeAttrs[attr.Key];
        if (attr.Value === oldValue) {
            return null;
        }
        target.setAttribute(attr.Key, attr.Value);
    });
    for (let index in oldNodeAttrs) {
        target.removeAttribute(index);
    }
    target.setAttribute('_tid', node.tid);
    target.setAttribute('_ref', node.ref);
    target.setAttribute('_atid', node.atid);
    target.setAttribute('events', BuildEvent(node.events));
    exts.Objects.PatchWith(target, '_id', node.id);
    exts.Objects.PatchWith(target, '_ref', node.ref);
    exts.Objects.PatchWith(target, '_tid', node.tid);
    exts.Objects.PatchWith(target, '_atid', node.atid);
}
exports.PatchJSONAttributes = PatchJSONAttributes;
function PatchDOMTree(newFragment, oldNodeOrMount, dictator, isChildRecursion) {
    if (isChildRecursion) {
        const rootNode = oldNodeOrMount.parentNode;
        if (!dictator.Same(oldNodeOrMount, newFragment)) {
            dom.replaceNode(rootNode, oldNodeOrMount, newFragment);
            return null;
        }
        if (!oldNodeOrMount.hasChildNodes()) {
            dom.replaceNode(rootNode, oldNodeOrMount, newFragment);
            return null;
        }
    }
    const oldChildren = oldNodeOrMount.childNodes;
    const oldChildrenLength = oldChildren.length;
    const newChildren = newFragment.childNodes;
    const newChildrenLength = newChildren.length;
    const removeOldLeft = newChildrenLength < oldChildrenLength;
    let lastIndex = 0;
    let lastNode;
    let lastNodeNextSibling;
    let newNodeHandled;
    for (; lastIndex < oldChildrenLength; lastIndex++) {
        if (lastIndex >= newChildrenLength) {
            break;
        }
        lastNode = oldChildren[lastIndex];
        newNodeHandled = newChildren[lastIndex];
        lastNodeNextSibling = lastNode.nextSibling;
        if (!dictator.Same(lastNode, newNodeHandled)) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        if (!dictator.Changed(lastNode, newNodeHandled)) {
            continue;
        }
        if (lastNode.nodeType === dom.TEXT_NODE || lastNode.nodeType === dom.COMMENT_NODE) {
            if (lastNode.textContent !== newNodeHandled.textContent) {
                lastNode.textContent = newNodeHandled.textContent;
            }
            continue;
        }
        if (!lastNode.hasChildNodes() && newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        if (lastNode.hasChildNodes() && !newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        const lastElement = lastNode;
        const newElement = newNodeHandled;
        PatchDOMAttributes(newElement, lastElement);
        lastElement.setAttribute('_patched', 'true');
        PatchDOMTree(newElement, lastElement, dictator, true);
        lastElement.removeAttribute('_patched');
    }
    if (removeOldLeft && lastNodeNextSibling !== null) {
        dom.removeFromNode(lastNodeNextSibling, null);
        return null;
    }
    for (; lastIndex < newChildrenLength; lastIndex++) {
        const newNode = newChildren[lastIndex];
        oldNodeOrMount.appendChild(newNode);
    }
}
exports.PatchDOMTree = PatchDOMTree;
function PatchDOMAttributes(newElement, oldElement) {
    const oldNodeAttrs = dom.recordAttributes(oldElement);
    for (let index in newElement.attributes) {
        const attr = newElement.attributes[index];
        const oldValue = oldNodeAttrs[attr.name];
        delete oldNodeAttrs[attr.name];
        if (attr.value === oldValue) {
            continue;
        }
        oldElement.setAttribute(attr.name, attr.value);
    }
    for (let index in oldNodeAttrs) {
        oldElement.removeAttribute(index);
    }
}
exports.PatchDOMAttributes = PatchDOMAttributes;

},{"./dom":6,"./extensions":7}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promise = require("promise-polyfill");
exports.PromiseAPI = {
    Promise: self.Promise,
};
if (!self.Promise) {
    exports.PromiseAPI.Promise = promise;
    self.Promise = promise;
}

},{"promise-polyfill":3}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const now = (function () {
    return (performance.now ||
        performance.mozNow ||
        performance.msNow ||
        performance.oNow ||
        performance.webkitNow ||
        Date.now);
})();
const frameRate = 1000 / 60;
const vendors = ['ms', 'moz', 'webkit', 'o'];
function GetRAF() {
    let lastTime = 0;
    const mod = {};
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        mod.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        mod.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'RequestCancelAnimationFrame'];
    }
    if (!mod.requestAnimationFrame || !mod.cancelAnimationFrame)
        mod.requestAnimationFrame = function (callback, element) {
            const currTime = now();
            const timeToCall = Math.max(0, frameRate - (currTime - lastTime));
            const id = window.setTimeout(function () {
                try {
                    callback(currTime + timeToCall);
                }
                catch (e) {
                    console.log('Error: ', e);
                    setTimeout(function () {
                        throw e;
                    }, 0);
                }
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if (!mod.cancelAnimationFrame) {
        mod.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
    return mod;
}
exports.GetRAF = GetRAF;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function linear(t) {
    return t;
}
exports.linear = linear;
function easeInQuad(t) {
    return t * t;
}
exports.easeInQuad = easeInQuad;
function easeOutQuad(t) {
    return t * (2 - t);
}
exports.easeOutQuad = easeOutQuad;
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
exports.easeInOutQuad = easeInOutQuad;
function easeInCubic(t) {
    return t * t * t;
}
exports.easeInCubic = easeInCubic;
function easeOutCubic(t) {
    return --t * t * t + 1;
}
exports.easeOutCubic = easeOutCubic;
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}
exports.easeInOutCubic = easeInOutCubic;
function easeInQuart(t) {
    return t * t * t * t;
}
exports.easeInQuart = easeInQuart;
function easeOutQuart(t) {
    return 1 - --t * t * t * t;
}
exports.easeOutQuart = easeOutQuart;
function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
}
exports.easeInOutQuart = easeInOutQuart;
function easeInQuint(t) {
    return t * t * t * t * t;
}
exports.easeInQuint = easeInQuint;
function easeOutQuint(t) {
    return 1 + --t * t * t * t * t;
}
exports.easeOutQuint = easeOutQuint;
function easeInOutQuint(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
}
exports.easeInOutQuint = easeInOutQuint;

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hasOwnProperty = Object.prototype.hasOwnProperty;
function Blank() { }
exports.Blank = Blank;
Blank.prototype = Object.create(null);
function has(map, property) {
    return hasOwnProperty.call(map, property);
}
exports.has = has;
function createMap() {
    return new Blank();
}
exports.createMap = createMap;
function truncateArray(arr, length) {
    while (arr.length > length) {
        arr.pop();
    }
}
exports.truncateArray = truncateArray;
function decodeFormBody(body) {
    let form = new FormData();
    body
        .trim()
        .split('&')
        .forEach(function (bytes) {
        if (bytes) {
            let split = bytes.split('=');
            let name = split.shift().replace(/\+/g, ' ');
            let value = split.join('=').replace(/\+/g, ' ');
            form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
    });
    return form;
}
exports.decodeFormBody = decodeFormBody;
function parseHTTPHeaders(rawHeaders) {
    let headers = new Headers();
    let preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function (line) {
        let parts = line.split(':');
        let key = parts.shift().trim();
        if (key) {
            let value = parts.join(':').trim();
            headers.append(key, value);
        }
    });
    return headers;
}
exports.parseHTTPHeaders = parseHTTPHeaders;
function fileReaderReady(reader) {
    return new Promise(function (resolve, reject) {
        reader.onload = function () {
            resolve(reader.result);
        };
        reader.onerror = function () {
            reject(reader.error);
        };
    });
}
exports.fileReaderReady = fileReaderReady;
function readBlobAsArrayBuffer(blob) {
    let reader = new FileReader();
    let promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise;
}
exports.readBlobAsArrayBuffer = readBlobAsArrayBuffer;
function readBlobAsText(blob) {
    let reader = new FileReader();
    let promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise;
}
exports.readBlobAsText = readBlobAsText;
function readArrayBufferAsText(buf) {
    let view = new Uint8Array(buf);
    let chars = new Array(view.length);
    for (let i = 0; i < view.length; i++) {
        chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('');
}
exports.readArrayBufferAsText = readArrayBufferAsText;
function bufferClone(buf) {
    if (buf.slice) {
        return buf.slice(0);
    }
    else {
        let view = new Uint8Array(buf.byteLength);
        view.set(new Uint8Array(buf));
        return view.buffer;
    }
}
exports.bufferClone = bufferClone;

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneSecond = 1000;
exports.OneMinute = exports.OneSecond * 60;
class Socket {
    constructor(addr, reader, exponent, maxReconnects, maxWait) {
        this.addr = addr;
        this.socket = null;
        this.reader = reader;
        this.maxWait = maxWait;
        this.userClosed = false;
        this.exponent = exponent;
        this.disconnected = false;
        this.attemptedConnects = 0;
        this.lastWait = exports.OneSecond;
        this.maxReconnect = maxReconnects;
        this.writeBuffer = new Array();
    }
    connect() {
        if (this.socket) {
            return;
        }
        if (this.attemptedConnects >= this.maxReconnect) {
            this.reader.Exhausted(this);
            return;
        }
        const socket = new WebSocket(this.addr);
        socket.addEventListener('open', this._opened.bind(this));
        socket.addEventListener('error', this._errored.bind(this));
        socket.addEventListener('message', this._messaged.bind(this));
        socket.addEventListener('close', this._disconnected.bind(this));
        this.socket = socket;
        this.disconnected = false;
    }
    send(message) {
        if (this.disconnected) {
            this.writeBuffer.push(message);
            return;
        }
        this.socket.send(message);
    }
    reset() {
        this.attemptedConnects = 0;
        this.lastWait = exports.OneSecond;
    }
    end() {
        this.userClosed = true;
        this.reader.Closed(this);
        this.socket.close();
        this.socket = null;
    }
    _disconnected(event) {
        this.reader.Disconnected(event, this);
        this.disconnected = true;
        this.socket = null;
        if (this.userClosed) {
            return;
        }
        let nextWait = this.lastWait;
        if (this.exponent) {
            nextWait = this.exponent(nextWait);
            if (nextWait > this.maxWait) {
                nextWait = this.maxWait;
            }
        }
        setTimeout(this.connect.bind(this), nextWait);
        this.attemptedConnects++;
    }
    _opened(event) {
        this.reader.Connected(event, this);
        while (this.writeBuffer.length > 0) {
            const message = this.writeBuffer.shift();
            this.socket.send(message);
        }
    }
    _errored(event) {
        this.reader.Errored(event, this);
    }
    _messaged(event) {
        this.reader.Message(event, this);
    }
}
exports.Socket = Socket;

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const raf = require("./raf-polyfill");
const utils = require("./utils");
const exts = require("./extensions");
const anime = require("./anime");
const patch = require("./patch");
const mount = require("./mount");
const dom = require("./dom");
const ws = require("./websocket");
const http = require("./http");
const tweened = require("./tween");
const inter = require("./interpolations");
const fetch_1 = require("./fetch");
const promise_1 = require("./promise");
exports.WebVM = {
    dom: dom,
    raf: raf,
    http: http,
    mount: mount,
    patch: patch,
    utils: utils,
    websocket: ws,
    fetch: fetch_1.fetchAPI,
    extensions: exts,
    promise: promise_1.PromiseAPI.Promise,
    vfx: {
        tween: tweened,
        animations: anime,
        interpolations: inter,
    },
};
self.WebVM = exports.WebVM;
exports.default = exports.WebVM;

},{"./anime":5,"./dom":6,"./extensions":7,"./fetch":8,"./http":9,"./interpolations":10,"./mount":11,"./patch":12,"./promise":13,"./raf-polyfill":14,"./tween":15,"./utils":16,"./websocket":17}]},{},[18])(18)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdGltZXJzLWJyb3dzZXJpZnkvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcHJvbWlzZS1wb2x5ZmlsbC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2Rpc3QvZmV0Y2gudW1kLmpzIiwic3JjL2FuaW1lLmpzIiwic3JjL2RvbS5qcyIsInNyYy9leHRlbnNpb25zLmpzIiwic3JjL2ZldGNoLmpzIiwic3JjL2h0dHAuanMiLCJzcmMvaW50ZXJwb2xhdGlvbnMuanMiLCJzcmMvbW91bnQuanMiLCJzcmMvcGF0Y2guanMiLCJzcmMvcHJvbWlzZS5qcyIsInNyYy9yYWYtcG9seWZpbGwuanMiLCJzcmMvdHdlZW4uanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd2Vic29ja2V0LmpzIiwic3JjL3dlYnZtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDblFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25oQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgbmV4dFRpY2sgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBhcHBseSA9IEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBpbW1lZGlhdGVJZHMgPSB7fTtcbnZhciBuZXh0SW1tZWRpYXRlSWQgPSAwO1xuXG4vLyBET00gQVBJcywgZm9yIGNvbXBsZXRlbmVzc1xuXG5leHBvcnRzLnNldFRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0VGltZW91dCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhclRpbWVvdXQpO1xufTtcbmV4cG9ydHMuc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0SW50ZXJ2YWwsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJJbnRlcnZhbCk7XG59O1xuZXhwb3J0cy5jbGVhclRpbWVvdXQgPVxuZXhwb3J0cy5jbGVhckludGVydmFsID0gZnVuY3Rpb24odGltZW91dCkgeyB0aW1lb3V0LmNsb3NlKCk7IH07XG5cbmZ1bmN0aW9uIFRpbWVvdXQoaWQsIGNsZWFyRm4pIHtcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY2xlYXJGbiA9IGNsZWFyRm47XG59XG5UaW1lb3V0LnByb3RvdHlwZS51bnJlZiA9IFRpbWVvdXQucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge307XG5UaW1lb3V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LCB0aGlzLl9pZCk7XG59O1xuXG4vLyBEb2VzIG5vdCBzdGFydCB0aGUgdGltZSwganVzdCBzZXRzIHVwIHRoZSBtZW1iZXJzIG5lZWRlZC5cbmV4cG9ydHMuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSwgbXNlY3MpIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IG1zZWNzO1xufTtcblxuZXhwb3J0cy51bmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IC0xO1xufTtcblxuZXhwb3J0cy5fdW5yZWZBY3RpdmUgPSBleHBvcnRzLmFjdGl2ZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuXG4gIHZhciBtc2VjcyA9IGl0ZW0uX2lkbGVUaW1lb3V0O1xuICBpZiAobXNlY3MgPj0gMCkge1xuICAgIGl0ZW0uX2lkbGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpIHtcbiAgICAgIGlmIChpdGVtLl9vblRpbWVvdXQpXG4gICAgICAgIGl0ZW0uX29uVGltZW91dCgpO1xuICAgIH0sIG1zZWNzKTtcbiAgfVxufTtcblxuLy8gVGhhdCdzIG5vdCBob3cgbm9kZS5qcyBpbXBsZW1lbnRzIGl0IGJ1dCB0aGUgZXhwb3NlZCBhcGkgaXMgdGhlIHNhbWUuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHNldEltbWVkaWF0ZSA6IGZ1bmN0aW9uKGZuKSB7XG4gIHZhciBpZCA9IG5leHRJbW1lZGlhdGVJZCsrO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPCAyID8gZmFsc2UgOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgaW1tZWRpYXRlSWRzW2lkXSA9IHRydWU7XG5cbiAgbmV4dFRpY2soZnVuY3Rpb24gb25OZXh0VGljaygpIHtcbiAgICBpZiAoaW1tZWRpYXRlSWRzW2lkXSkge1xuICAgICAgLy8gZm4uY2FsbCgpIGlzIGZhc3RlciBzbyB3ZSBvcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiB1c2UtY2FzZVxuICAgICAgLy8gQHNlZSBodHRwOi8vanNwZXJmLmNvbS9jYWxsLWFwcGx5LXNlZ3VcbiAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICAgIC8vIFByZXZlbnQgaWRzIGZyb20gbGVha2luZ1xuICAgICAgZXhwb3J0cy5jbGVhckltbWVkaWF0ZShpZCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gaWQ7XG59O1xuXG5leHBvcnRzLmNsZWFySW1tZWRpYXRlID0gdHlwZW9mIGNsZWFySW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBjbGVhckltbWVkaWF0ZSA6IGZ1bmN0aW9uKGlkKSB7XG4gIGRlbGV0ZSBpbW1lZGlhdGVJZHNbaWRdO1xufTsiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEB0aGlzIHtQcm9taXNlfVxuICovXG5mdW5jdGlvbiBmaW5hbGx5Q29uc3RydWN0b3IoY2FsbGJhY2spIHtcbiAgdmFyIGNvbnN0cnVjdG9yID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgcmV0dXJuIHRoaXMudGhlbihcbiAgICBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yLnJlc29sdmUoY2FsbGJhY2soKSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgKTtcbn1cblxuLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gcHJvbWlzZS1wb2x5ZmlsbCB3aWxsIGJlIHVuYWZmZWN0ZWQgYnlcbi8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxudmFyIHNldFRpbWVvdXRGdW5jID0gc2V0VGltZW91dDtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8vIFBvbHlmaWxsIGZvciBGdW5jdGlvbi5wcm90b3R5cGUuYmluZFxuZnVuY3Rpb24gYmluZChmbiwgdGhpc0FyZykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZm4uYXBwbHkodGhpc0FyZywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb21pc2UpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpO1xuICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSBmdW5jdGlvbicpO1xuICAvKiogQHR5cGUgeyFudW1iZXJ9ICovXG4gIHRoaXMuX3N0YXRlID0gMDtcbiAgLyoqIEB0eXBlIHshYm9vbGVhbn0gKi9cbiAgdGhpcy5faGFuZGxlZCA9IGZhbHNlO1xuICAvKiogQHR5cGUge1Byb21pc2V8dW5kZWZpbmVkfSAqL1xuICB0aGlzLl92YWx1ZSA9IHVuZGVmaW5lZDtcbiAgLyoqIEB0eXBlIHshQXJyYXk8IUZ1bmN0aW9uPn0gKi9cbiAgdGhpcy5fZGVmZXJyZWRzID0gW107XG5cbiAgZG9SZXNvbHZlKGZuLCB0aGlzKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlKHNlbGYsIGRlZmVycmVkKSB7XG4gIHdoaWxlIChzZWxmLl9zdGF0ZSA9PT0gMykge1xuICAgIHNlbGYgPSBzZWxmLl92YWx1ZTtcbiAgfVxuICBpZiAoc2VsZi5fc3RhdGUgPT09IDApIHtcbiAgICBzZWxmLl9kZWZlcnJlZHMucHVzaChkZWZlcnJlZCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHNlbGYuX2hhbmRsZWQgPSB0cnVlO1xuICBQcm9taXNlLl9pbW1lZGlhdGVGbihmdW5jdGlvbigpIHtcbiAgICB2YXIgY2IgPSBzZWxmLl9zdGF0ZSA9PT0gMSA/IGRlZmVycmVkLm9uRnVsZmlsbGVkIDogZGVmZXJyZWQub25SZWplY3RlZDtcbiAgICBpZiAoY2IgPT09IG51bGwpIHtcbiAgICAgIChzZWxmLl9zdGF0ZSA9PT0gMSA/IHJlc29sdmUgOiByZWplY3QpKGRlZmVycmVkLnByb21pc2UsIHNlbGYuX3ZhbHVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldDtcbiAgICB0cnkge1xuICAgICAgcmV0ID0gY2Ioc2VsZi5fdmFsdWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCByZXQpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShzZWxmLCBuZXdWYWx1ZSkge1xuICB0cnkge1xuICAgIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gICAgaWYgKG5ld1ZhbHVlID09PSBzZWxmKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKTtcbiAgICBpZiAoXG4gICAgICBuZXdWYWx1ZSAmJlxuICAgICAgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKVxuICAgICkge1xuICAgICAgdmFyIHRoZW4gPSBuZXdWYWx1ZS50aGVuO1xuICAgICAgaWYgKG5ld1ZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICBzZWxmLl9zdGF0ZSA9IDM7XG4gICAgICAgIHNlbGYuX3ZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgIGZpbmFsZShzZWxmKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkb1Jlc29sdmUoYmluZCh0aGVuLCBuZXdWYWx1ZSksIHNlbGYpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHNlbGYuX3N0YXRlID0gMTtcbiAgICBzZWxmLl92YWx1ZSA9IG5ld1ZhbHVlO1xuICAgIGZpbmFsZShzZWxmKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChzZWxmLCBlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWplY3Qoc2VsZiwgbmV3VmFsdWUpIHtcbiAgc2VsZi5fc3RhdGUgPSAyO1xuICBzZWxmLl92YWx1ZSA9IG5ld1ZhbHVlO1xuICBmaW5hbGUoc2VsZik7XG59XG5cbmZ1bmN0aW9uIGZpbmFsZShzZWxmKSB7XG4gIGlmIChzZWxmLl9zdGF0ZSA9PT0gMiAmJiBzZWxmLl9kZWZlcnJlZHMubGVuZ3RoID09PSAwKSB7XG4gICAgUHJvbWlzZS5faW1tZWRpYXRlRm4oZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXNlbGYuX2hhbmRsZWQpIHtcbiAgICAgICAgUHJvbWlzZS5fdW5oYW5kbGVkUmVqZWN0aW9uRm4oc2VsZi5fdmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNlbGYuX2RlZmVycmVkcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGhhbmRsZShzZWxmLCBzZWxmLl9kZWZlcnJlZHNbaV0pO1xuICB9XG4gIHNlbGYuX2RlZmVycmVkcyA9IG51bGw7XG59XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHByb21pc2UpIHtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbDtcbiAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIHNlbGYpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdHJ5IHtcbiAgICBmbihcbiAgICAgIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICByZXNvbHZlKHNlbGYsIHZhbHVlKTtcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgIHJlamVjdChzZWxmLCByZWFzb24pO1xuICAgICAgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3Qoc2VsZiwgZXgpO1xuICB9XG59XG5cblByb21pc2UucHJvdG90eXBlWydjYXRjaCddID0gZnVuY3Rpb24ob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIC8vIEB0cy1pZ25vcmVcbiAgdmFyIHByb20gPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBoYW5kbGUodGhpcywgbmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHByb20pKTtcbiAgcmV0dXJuIHByb207XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZVsnZmluYWxseSddID0gZmluYWxseUNvbnN0cnVjdG9yO1xuXG5Qcm9taXNlLmFsbCA9IGZ1bmN0aW9uKGFycikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKCFhcnIgfHwgdHlwZW9mIGFyci5sZW5ndGggPT09ICd1bmRlZmluZWQnKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZS5hbGwgYWNjZXB0cyBhbiBhcnJheScpO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiByZXNvbHZlKFtdKTtcbiAgICB2YXIgcmVtYWluaW5nID0gYXJncy5sZW5ndGg7XG5cbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW47XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGVuLmNhbGwoXG4gICAgICAgICAgICAgIHZhbCxcbiAgICAgICAgICAgICAgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzKGksIHZhbCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXJnc1tpXSA9IHZhbDtcbiAgICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgcmVqZWN0KGV4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlcyhpLCBhcmdzW2ldKTtcbiAgICB9XG4gIH0pO1xufTtcblxuUHJvbWlzZS5yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHJlc29sdmUodmFsdWUpO1xuICB9KTtcbn07XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHJlamVjdCh2YWx1ZSk7XG4gIH0pO1xufTtcblxuUHJvbWlzZS5yYWNlID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdmFsdWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0udGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vLyBVc2UgcG9seWZpbGwgZm9yIHNldEltbWVkaWF0ZSBmb3IgcGVyZm9ybWFuY2UgZ2FpbnNcblByb21pc2UuX2ltbWVkaWF0ZUZuID1cbiAgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicgJiZcbiAgICBmdW5jdGlvbihmbikge1xuICAgICAgc2V0SW1tZWRpYXRlKGZuKTtcbiAgICB9KSB8fFxuICBmdW5jdGlvbihmbikge1xuICAgIHNldFRpbWVvdXRGdW5jKGZuLCAwKTtcbiAgfTtcblxuUHJvbWlzZS5fdW5oYW5kbGVkUmVqZWN0aW9uRm4gPSBmdW5jdGlvbiBfdW5oYW5kbGVkUmVqZWN0aW9uRm4oZXJyKSB7XG4gIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZSkge1xuICAgIGNvbnNvbGUud2FybignUG9zc2libGUgVW5oYW5kbGVkIFByb21pc2UgUmVqZWN0aW9uOicsIGVycik7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwuV0hBVFdHRmV0Y2ggPSB7fSkpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjpcbiAgICAgICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmXG4gICAgICAnQmxvYicgaW4gc2VsZiAmJlxuICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9O1xuXG4gIGZ1bmN0aW9uIGlzRGF0YVZpZXcob2JqKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF07XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPVxuICAgICAgQXJyYXlCdWZmZXIuaXNWaWV3IHx8XG4gICAgICBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKTtcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge307XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaGVhZGVycykpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoaGVhZGVyWzBdLCBoZWFkZXJbMV0pO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpO1xuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpO1xuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdO1xuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSArICcsICcgKyB2YWx1ZSA6IHZhbHVlO1xuICB9O1xuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV07XG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpO1xuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9O1xuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfTtcblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpO1xuICB9O1xuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgaXRlbXMucHVzaChuYW1lKTtcbiAgICB9KTtcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpdGVtcy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKTtcbiAgICB9KTtcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH07XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgICB9O1xuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcik7XG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpO1xuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKTtcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKTtcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKTtcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKTtcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpO1xuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2U7XG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keTtcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5O1xuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHk7XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keTtcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpO1xuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKTtcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSk7XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChib2R5KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcyk7XG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcyk7XG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfTtcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ107XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKCk7XG4gICAgcmV0dXJuIG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5O1xuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybDtcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFscztcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2Q7XG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlO1xuICAgICAgdGhpcy5zaWduYWwgPSBpbnB1dC5zaWduYWw7XG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdDtcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dCk7XG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnc2FtZS1vcmlnaW4nO1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKTtcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpO1xuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbDtcbiAgICB0aGlzLnNpZ25hbCA9IG9wdGlvbnMuc2lnbmFsIHx8IHRoaXMuc2lnbmFsO1xuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsO1xuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KTtcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHtib2R5OiB0aGlzLl9ib2R5SW5pdH0pXG4gIH07XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIGJvZHlcbiAgICAgIC50cmltKClcbiAgICAgIC5zcGxpdCgnJicpXG4gICAgICAuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpO1xuICAgICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKTtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJyk7XG4gICAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xuICAgIC8vIFJlcGxhY2UgaW5zdGFuY2VzIG9mIFxcclxcbiBhbmQgXFxuIGZvbGxvd2VkIGJ5IGF0IGxlYXN0IG9uZSBzcGFjZSBvciBob3Jpem9udGFsIHRhYiB3aXRoIGEgc3BhY2VcbiAgICAvLyBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNzIzMCNzZWN0aW9uLTMuMlxuICAgIHZhciBwcmVQcm9jZXNzZWRIZWFkZXJzID0gcmF3SGVhZGVycy5yZXBsYWNlKC9cXHI/XFxuW1xcdCBdKy9nLCAnICcpO1xuICAgIHByZVByb2Nlc3NlZEhlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKTtcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKTtcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSk7XG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCc7XG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1cyA9PT0gdW5kZWZpbmVkID8gMjAwIDogb3B0aW9ucy5zdGF0dXM7XG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMDtcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSyc7XG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKTtcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnO1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KTtcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpO1xuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH07XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KTtcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJztcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfTtcblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF07XG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfTtcblxuICBleHBvcnRzLkRPTUV4Y2VwdGlvbiA9IHNlbGYuRE9NRXhjZXB0aW9uO1xuICB0cnkge1xuICAgIG5ldyBleHBvcnRzLkRPTUV4Y2VwdGlvbigpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBleHBvcnRzLkRPTUV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UsIG5hbWUpIHtcbiAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgdmFyIGVycm9yID0gRXJyb3IobWVzc2FnZSk7XG4gICAgICB0aGlzLnN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgfTtcbiAgICBleHBvcnRzLkRPTUV4Y2VwdGlvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG4gICAgZXhwb3J0cy5ET01FeGNlcHRpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gZXhwb3J0cy5ET01FeGNlcHRpb247XG4gIH1cblxuICBmdW5jdGlvbiBmZXRjaChpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpO1xuXG4gICAgICBpZiAocmVxdWVzdC5zaWduYWwgJiYgcmVxdWVzdC5zaWduYWwuYWJvcnRlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBleHBvcnRzLkRPTUV4Y2VwdGlvbignQWJvcnRlZCcsICdBYm9ydEVycm9yJykpXG4gICAgICB9XG5cbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgZnVuY3Rpb24gYWJvcnRYaHIoKSB7XG4gICAgICAgIHhoci5hYm9ydCgpO1xuICAgICAgfVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpO1xuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpO1xuICAgICAgfTtcblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSk7XG4gICAgICB9O1xuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpO1xuICAgICAgfTtcblxuICAgICAgeGhyLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBleHBvcnRzLkRPTUV4Y2VwdGlvbignQWJvcnRlZCcsICdBYm9ydEVycm9yJykpO1xuICAgICAgfTtcblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKTtcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ29taXQnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJztcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnNpZ25hbCkge1xuICAgICAgICByZXF1ZXN0LnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGFib3J0WGhyKTtcblxuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gRE9ORSAoc3VjY2VzcyBvciBmYWlsdXJlKVxuICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgcmVxdWVzdC5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBhYm9ydFhocik7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KTtcbiAgICB9KVxuICB9XG5cbiAgZmV0Y2gucG9seWZpbGwgPSB0cnVlO1xuXG4gIGlmICghc2VsZi5mZXRjaCkge1xuICAgIHNlbGYuZmV0Y2ggPSBmZXRjaDtcbiAgICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICAgIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3Q7XG4gICAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlO1xuICB9XG5cbiAgZXhwb3J0cy5IZWFkZXJzID0gSGVhZGVycztcbiAgZXhwb3J0cy5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgZXhwb3J0cy5SZXNwb25zZSA9IFJlc3BvbnNlO1xuICBleHBvcnRzLmZldGNoID0gZmV0Y2g7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgcmFmUG9seWZpbGwgPSByZXF1aXJlKFwiLi9yYWYtcG9seWZpbGxcIik7XG5jbGFzcyBBbmltYXRpb25RdWV1ZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc2tpcCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmJpbmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJlcXVlc3RBbmltYXRpb25JRCA9IC0xO1xuICAgICAgICB0aGlzLmZyYW1lcyA9IG5ldyBBcnJheSgpO1xuICAgICAgICB0aGlzLmJpbmRDeWNsZSA9IHRoaXMuY3ljbGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yYWZQcm92aWRlciA9IHJhZlBvbHlmaWxsLkdldFJBRigpO1xuICAgIH1cbiAgICBuZXcoKSB7XG4gICAgICAgIGNvbnN0IG5ld0ZyYW1lID0gbmV3IEFGcmFtZSh0aGlzLmZyYW1lcy5sZW5ndGgsIHRoaXMpO1xuICAgICAgICB0aGlzLmZyYW1lcy5wdXNoKG5ld0ZyYW1lKTtcbiAgICAgICAgcmV0dXJuIG5ld0ZyYW1lO1xuICAgIH1cbiAgICBhZGQoZikge1xuICAgICAgICBmLnF1ZXVlSW5kZXggPSB0aGlzLmZyYW1lcy5sZW5ndGg7XG4gICAgICAgIGYucXVldWUgPSB0aGlzO1xuICAgICAgICB0aGlzLmZyYW1lcy5wdXNoKGYpO1xuICAgIH1cbiAgICByZXN1bWUoKSB7XG4gICAgICAgIHRoaXMuc2tpcCA9IGZhbHNlO1xuICAgIH1cbiAgICBwYXVzZSgpIHtcbiAgICAgICAgdGhpcy5za2lwID0gdHJ1ZTtcbiAgICB9XG4gICAgdW5iaW5kKCkge1xuICAgICAgICBpZiAoIXRoaXMuYmluZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJhZlByb3ZpZGVyLmNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMucmVxdWVzdEFuaW1hdGlvbklEKTtcbiAgICB9XG4gICAgYmluZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuYmluZGVkKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIHRoaXMucmVxdWVzdEFuaW1hdGlvbklEID0gdGhpcy5yYWZQcm92aWRlci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5iaW5kQ3ljbGUsIG51bGwpO1xuICAgICAgICB0aGlzLmJpbmRlZCA9IHRydWU7XG4gICAgfVxuICAgIGN5Y2xlKG1zKSB7XG4gICAgICAgIGlmICh0aGlzLmZyYW1lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuYmluZGVkID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mcmFtZXMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgICAgICAgICAgaWYgKCFmLnBhdXNlZCgpKSB7XG4gICAgICAgICAgICAgICAgZi5hbmltYXRlKG1zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYmluZCgpO1xuICAgIH1cbn1cbmV4cG9ydHMuQW5pbWF0aW9uUXVldWUgPSBBbmltYXRpb25RdWV1ZTtcbmNsYXNzIEFGcmFtZSB7XG4gICAgY29uc3RydWN0b3IoaW5kZXgsIHF1ZXVlKSB7XG4gICAgICAgIHRoaXMuc2tpcCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnF1ZXVlID0gcXVldWU7XG4gICAgICAgIHRoaXMucXVldWVJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IG5ldyBBcnJheSgpO1xuICAgIH1cbiAgICBhZGQoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgfVxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrcy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICBwYXVzZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNraXA7XG4gICAgfVxuICAgIHBhdXNlKCkge1xuICAgICAgICB0aGlzLnNraXAgPSB0cnVlO1xuICAgIH1cbiAgICBzdG9wKCkge1xuICAgICAgICB0aGlzLnBhdXNlKCk7XG4gICAgICAgIGlmICh0aGlzLnF1ZXVlSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5xdWV1ZS5mcmFtZXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHRoaXMucXVldWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRvdGFsID0gdGhpcy5xdWV1ZS5mcmFtZXMubGVuZ3RoO1xuICAgICAgICBpZiAodG90YWwgPT0gMSkge1xuICAgICAgICAgICAgdGhpcy5xdWV1ZS5mcmFtZXMucG9wKCk7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5xdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnF1ZXVlLmZyYW1lc1t0aGlzLnF1ZXVlSW5kZXhdID0gdGhpcy5xdWV1ZS5mcmFtZXNbdG90YWwgLSAxXTtcbiAgICAgICAgdGhpcy5xdWV1ZS5mcmFtZXMubGVuZ3RoID0gdG90YWwgLSAxO1xuICAgICAgICB0aGlzLnF1ZXVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgYW5pbWF0ZSh0cykge1xuICAgICAgICBmb3IgKGxldCBpbmRleCBpbiB0aGlzLmNhbGxiYWNrcykge1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB0aGlzLmNhbGxiYWNrc1tpbmRleF07XG4gICAgICAgICAgICBjYWxsYmFjayh0cyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLkFGcmFtZSA9IEFGcmFtZTtcbmNsYXNzIENoYW5nZU1hbmFnZXIge1xuICAgIHN0YXRpYyBkcmFpblRhc2tzKHEsIHdyYXBwZXIpIHtcbiAgICAgICAgbGV0IHRhc2sgPSBxLnNoaWZ0KCk7XG4gICAgICAgIHdoaWxlICh0YXNrKSB7XG4gICAgICAgICAgICBpZiAod3JhcHBlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHdyYXBwZXIodGFzayk7XG4gICAgICAgICAgICAgICAgdGFzayA9IHEuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhc2soKTtcbiAgICAgICAgICAgIHRhc2sgPSBxLnNoaWZ0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uc3RydWN0b3IocXVldWUpIHtcbiAgICAgICAgdGhpcy5yZWFkcyA9IG5ldyBBcnJheSgpO1xuICAgICAgICB0aGlzLndyaXRlcyA9IG5ldyBBcnJheSgpO1xuICAgICAgICB0aGlzLnJlYWRTdGF0ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmluUmVhZENhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pbldyaXRlQ2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNjaGVkdWxlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmZyYW1lID0gcXVldWUubmV3KCk7XG4gICAgfVxuICAgIG11dGF0ZShmbikge1xuICAgICAgICB0aGlzLndyaXRlcy5wdXNoKGZuKTtcbiAgICAgICAgdGhpcy5fc2NoZWR1bGUoKTtcbiAgICB9XG4gICAgcmVhZChmbikge1xuICAgICAgICB0aGlzLnJlYWRzLnB1c2goZm4pO1xuICAgICAgICB0aGlzLl9zY2hlZHVsZSgpO1xuICAgIH1cbiAgICBfc2NoZWR1bGUoKSB7XG4gICAgICAgIGlmICh0aGlzLnNjaGVkdWxlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2NoZWR1bGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mcmFtZS5hZGQodGhpcy5fcnVuVGFza3MuYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIF9ydW5UYXNrcygpIHtcbiAgICAgICAgY29uc3QgcmVhZEVycm9yID0gdGhpcy5fcnVuUmVhZHMoKTtcbiAgICAgICAgaWYgKHJlYWRFcnJvciAhPT0gbnVsbCAmJiByZWFkRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aHJvdyByZWFkRXJyb3I7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd3JpdGVFcnJvciA9IHRoaXMuX3J1bldyaXRlcygpO1xuICAgICAgICBpZiAod3JpdGVFcnJvciAhPT0gbnVsbCAmJiB3cml0ZUVycm9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhyb3cgd3JpdGVFcnJvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yZWFkcy5sZW5ndGggPiAwIHx8IHRoaXMud3JpdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZHVsZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgfVxuICAgIF9ydW5SZWFkcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIENoYW5nZU1hbmFnZXIuZHJhaW5UYXNrcyh0aGlzLnJlYWRzLCB0aGlzLl9leGVjUmVhZHMuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBfZXhlY1JlYWRzKHRhc2spIHtcbiAgICAgICAgdGhpcy5pblJlYWRDYWxsID0gdHJ1ZTtcbiAgICAgICAgdGFzaygpO1xuICAgICAgICB0aGlzLmluUmVhZENhbGwgPSBmYWxzZTtcbiAgICB9XG4gICAgX3J1bldyaXRlcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIENoYW5nZU1hbmFnZXIuZHJhaW5UYXNrcyh0aGlzLndyaXRlcywgdGhpcy5fZXhlY1dyaXRlLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgX2V4ZWNXcml0ZSh0YXNrKSB7XG4gICAgICAgIHRoaXMuaW5Xcml0ZUNhbGwgPSB0cnVlO1xuICAgICAgICB0YXNrKCk7XG4gICAgICAgIHRoaXMuaW5Xcml0ZUNhbGwgPSBmYWxzZTtcbiAgICB9XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1hbmltZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbmNvbnN0IGV4dHMgPSByZXF1aXJlKFwiLi9leHRlbnNpb25zXCIpO1xuZXhwb3J0cy5FTEVNRU5UX05PREUgPSAxO1xuZXhwb3J0cy5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFID0gMTE7XG5leHBvcnRzLkRPQ1VNRU5UX05PREUgPSA5O1xuZXhwb3J0cy5URVhUX05PREUgPSAzO1xuZXhwb3J0cy5DT01NRU5UX05PREUgPSA4O1xuY29uc3QgYXR0cmlidXRlcyA9IHV0aWxzXzEuY3JlYXRlTWFwKCk7XG5hdHRyaWJ1dGVzWydzdHlsZSddID0gYXBwbHlTdHlsZTtcbmZ1bmN0aW9uIGlzRG9jdW1lbnRSb290KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMTEgfHwgbm9kZS5ub2RlVHlwZSA9PT0gOTtcbn1cbmV4cG9ydHMuaXNEb2N1bWVudFJvb3QgPSBpc0RvY3VtZW50Um9vdDtcbmZ1bmN0aW9uIGlzRWxlbWVudChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDE7XG59XG5leHBvcnRzLmlzRWxlbWVudCA9IGlzRWxlbWVudDtcbmZ1bmN0aW9uIGlzVGV4dChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDM7XG59XG5leHBvcnRzLmlzVGV4dCA9IGlzVGV4dDtcbmZ1bmN0aW9uIGdldEFuY2VzdHJ5KG5vZGUsIHJvb3QpIHtcbiAgICBjb25zdCBhbmNlc3RyeSA9IFtdO1xuICAgIGxldCBjdXIgPSBub2RlO1xuICAgIHdoaWxlIChjdXIgIT09IHJvb3QpIHtcbiAgICAgICAgY29uc3QgbiA9IGN1cjtcbiAgICAgICAgYW5jZXN0cnkucHVzaChuKTtcbiAgICAgICAgY3VyID0gbi5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gYW5jZXN0cnk7XG59XG5leHBvcnRzLmdldEFuY2VzdHJ5ID0gZ2V0QW5jZXN0cnk7XG5jb25zdCBnZXRSb290Tm9kZSA9IE5vZGUucHJvdG90eXBlLmdldFJvb3ROb2RlIHx8XG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgY3VyID0gdGhpcztcbiAgICAgICAgbGV0IHByZXYgPSBjdXI7XG4gICAgICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgICAgIHByZXYgPSBjdXI7XG4gICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50Tm9kZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9O1xuZnVuY3Rpb24gcmV2ZXJzZUNvbGxlY3ROb2RlV2l0aEJyZWFkdGgocGFyZW50LCBtYXRjaGVyLCBtYXRjaGVzKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5sYXN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBpZiAobWF0Y2hlcihjdXIpKSB7XG4gICAgICAgICAgICBtYXRjaGVzLnB1c2goY3VyKTtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIucHJldmlvdXNTaWJsaW5nO1xuICAgIH1cbn1cbmV4cG9ydHMucmV2ZXJzZUNvbGxlY3ROb2RlV2l0aEJyZWFkdGggPSByZXZlcnNlQ29sbGVjdE5vZGVXaXRoQnJlYWR0aDtcbmZ1bmN0aW9uIHJldmVyc2VGaW5kTm9kZVdpdGhCcmVhZHRoKHBhcmVudCwgbWF0Y2hlcikge1xuICAgIGxldCBjdXIgPSBwYXJlbnQubGFzdENoaWxkO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgaWYgKG1hdGNoZXIoY3VyKSkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cjtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIucHJldmlvdXNTaWJsaW5nO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydHMucmV2ZXJzZUZpbmROb2RlV2l0aEJyZWFkdGggPSByZXZlcnNlRmluZE5vZGVXaXRoQnJlYWR0aDtcbmZ1bmN0aW9uIGNvbGxlY3ROb2RlV2l0aEJyZWFkdGgocGFyZW50LCBtYXRjaGVyLCBtYXRjaGVzKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5maXJzdENoaWxkO1xuICAgIGlmIChtYXRjaGVyKGN1cikpIHtcbiAgICAgICAgbWF0Y2hlcy5wdXNoKGN1cik7XG4gICAgfVxuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgaWYgKG1hdGNoZXIoY3VyLm5leHRTaWJsaW5nKSkge1xuICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKGN1cik7XG4gICAgICAgIH1cbiAgICAgICAgY3VyID0gY3VyLm5leHRTaWJsaW5nO1xuICAgIH1cbn1cbmV4cG9ydHMuY29sbGVjdE5vZGVXaXRoQnJlYWR0aCA9IGNvbGxlY3ROb2RlV2l0aEJyZWFkdGg7XG5mdW5jdGlvbiBjb2xsZWN0Tm9kZVdpdGhEZXB0aChwYXJlbnQsIG1hdGNoZXIsIG1hdGNoZXMpIHtcbiAgICBsZXQgY3VyID0gcGFyZW50LmZpcnN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBpZiAobWF0Y2hlcihjdXIpKSB7XG4gICAgICAgICAgICBtYXRjaGVzLnB1c2goY3VyKTtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIuZmlyc3RDaGlsZDtcbiAgICB9XG59XG5leHBvcnRzLmNvbGxlY3ROb2RlV2l0aERlcHRoID0gY29sbGVjdE5vZGVXaXRoRGVwdGg7XG5mdW5jdGlvbiBmaW5kTm9kZVdpdGhCcmVhZHRoKHBhcmVudCwgbWF0Y2hlcikge1xuICAgIGxldCBjdXIgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChtYXRjaGVyKGN1cikpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXI7XG4gICAgICAgIH1cbiAgICAgICAgY3VyID0gY3VyLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydHMuZmluZE5vZGVXaXRoQnJlYWR0aCA9IGZpbmROb2RlV2l0aEJyZWFkdGg7XG5mdW5jdGlvbiBmaW5kTm9kZVdpdGhEZXB0aChwYXJlbnQsIG1hdGNoZXIpIHtcbiAgICBsZXQgY3VyID0gcGFyZW50LmZpcnN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBpZiAobWF0Y2hlcihjdXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5maXJzdENoaWxkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydHMuZmluZE5vZGVXaXRoRGVwdGggPSBmaW5kTm9kZVdpdGhEZXB0aDtcbmZ1bmN0aW9uIGZpbmREZXB0aEZpcnN0KHBhcmVudCwgbWF0Y2hlcikge1xuICAgIGxldCBjdXIgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVXaXRoRGVwdGgoY3VyLCBtYXRjaGVyKTtcbiAgICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgICAgIH1cbiAgICAgICAgY3VyID0gY3VyLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydHMuZmluZERlcHRoRmlyc3QgPSBmaW5kRGVwdGhGaXJzdDtcbmZ1bmN0aW9uIGNvbGxlY3REZXB0aEZpcnN0KHBhcmVudCwgbWF0Y2hlciwgbWF0Y2hlcykge1xuICAgIGxldCBjdXIgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGNvbGxlY3ROb2RlV2l0aERlcHRoKGN1ciwgbWF0Y2hlciwgbWF0Y2hlcyk7XG4gICAgICAgIGN1ciA9IGN1ci5uZXh0U2libGluZztcbiAgICB9XG4gICAgcmV0dXJuO1xufVxuZXhwb3J0cy5jb2xsZWN0RGVwdGhGaXJzdCA9IGNvbGxlY3REZXB0aEZpcnN0O1xuZnVuY3Rpb24gZmluZEJyZWFkdGhGaXJzdChwYXJlbnQsIG1hdGNoZXIpIHtcbiAgICBsZXQgY3VyID0gcGFyZW50LmZpcnN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmROb2RlV2l0aEJyZWFkdGgoY3VyLCBtYXRjaGVyKTtcbiAgICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgICAgIH1cbiAgICAgICAgY3VyID0gY3VyLmZpcnN0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5maW5kQnJlYWR0aEZpcnN0ID0gZmluZEJyZWFkdGhGaXJzdDtcbmZ1bmN0aW9uIGFwcGx5RWFjaE5vZGUocGFyZW50LCBmbikge1xuICAgIGZuKHBhcmVudCk7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgYXBwbHlFYWNoTm9kZShjdXIubmV4dFNpYmxpbmcsIGZuKTtcbiAgICAgICAgY3VyID0gY3VyLm5leHRTaWJsaW5nO1xuICAgIH1cbn1cbmV4cG9ydHMuYXBwbHlFYWNoTm9kZSA9IGFwcGx5RWFjaE5vZGU7XG5mdW5jdGlvbiByZXZlcnNlQXBwbHlFYWNoTm9kZShwYXJlbnQsIGZuKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5sYXN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICByZXZlcnNlQXBwbHlFYWNoTm9kZShjdXIsIGZuKTtcbiAgICAgICAgY3VyID0gY3VyLnByZXZpb3VzU2libGluZztcbiAgICB9XG4gICAgZm4ocGFyZW50KTtcbn1cbmV4cG9ydHMucmV2ZXJzZUFwcGx5RWFjaE5vZGUgPSByZXZlcnNlQXBwbHlFYWNoTm9kZTtcbmZ1bmN0aW9uIGNvbGxlY3RCcmVhZHRoRmlyc3QocGFyZW50LCBtYXRjaGVyLCBtYXRjaGVzKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgY29sbGVjdE5vZGVXaXRoQnJlYWR0aChjdXIsIG1hdGNoZXIsIG1hdGNoZXMpO1xuICAgICAgICBjdXIgPSBjdXIuZmlyc3RDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuO1xufVxuZXhwb3J0cy5jb2xsZWN0QnJlYWR0aEZpcnN0ID0gY29sbGVjdEJyZWFkdGhGaXJzdDtcbmZ1bmN0aW9uIGdldEFjdGl2ZUVsZW1lbnQobm9kZSkge1xuICAgIGNvbnN0IHJvb3QgPSBnZXRSb290Tm9kZS5jYWxsKG5vZGUpO1xuICAgIHJldHVybiBpc0RvY3VtZW50Um9vdChyb290KSA/IHJvb3QuYWN0aXZlRWxlbWVudCA6IG51bGw7XG59XG5leHBvcnRzLmdldEFjdGl2ZUVsZW1lbnQgPSBnZXRBY3RpdmVFbGVtZW50O1xuZnVuY3Rpb24gZ2V0Rm9jdXNlZFBhdGgobm9kZSwgcm9vdCkge1xuICAgIGNvbnN0IGFjdGl2ZUVsZW1lbnQgPSBnZXRBY3RpdmVFbGVtZW50KG5vZGUpO1xuICAgIGlmICghYWN0aXZlRWxlbWVudCB8fCAhbm9kZS5jb250YWlucyhhY3RpdmVFbGVtZW50KSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBnZXRBbmNlc3RyeShhY3RpdmVFbGVtZW50LCByb290KTtcbn1cbmV4cG9ydHMuZ2V0Rm9jdXNlZFBhdGggPSBnZXRGb2N1c2VkUGF0aDtcbmZ1bmN0aW9uIG1vdmVCZWZvcmUocGFyZW50Tm9kZSwgbm9kZSwgcmVmZXJlbmNlTm9kZSkge1xuICAgIGNvbnN0IGluc2VydFJlZmVyZW5jZU5vZGUgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgIGxldCBjdXIgPSByZWZlcmVuY2VOb2RlO1xuICAgIHdoaWxlIChjdXIgIT09IG51bGwgJiYgY3VyICE9PSBub2RlKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBjdXIubmV4dFNpYmxpbmc7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGN1ciwgaW5zZXJ0UmVmZXJlbmNlTm9kZSk7XG4gICAgICAgIGN1ciA9IG5leHQ7XG4gICAgfVxufVxuZXhwb3J0cy5tb3ZlQmVmb3JlID0gbW92ZUJlZm9yZTtcbmZ1bmN0aW9uIGluc2VydEJlZm9yZShwYXJlbnROb2RlLCBub2RlLCByZWZlcmVuY2VOb2RlKSB7XG4gICAgaWYgKHJlZmVyZW5jZU5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIHJlZmVyZW5jZU5vZGUpO1xuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5pbnNlcnRCZWZvcmUgPSBpbnNlcnRCZWZvcmU7XG5mdW5jdGlvbiByZXBsYWNlTm9kZShwYXJlbnROb2RlLCBub2RlLCByZXBsYWNlbWVudCkge1xuICAgIGlmIChyZXBsYWNlbWVudCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQocmVwbGFjZW1lbnQsIG5vZGUpO1xuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5yZXBsYWNlTm9kZSA9IHJlcGxhY2VOb2RlO1xuZnVuY3Rpb24gcmVwbGFjZU5vZGVJZih0YXJnZXROb2RlLCByZXBsYWNlbWVudCkge1xuICAgIGlmIChyZXBsYWNlbWVudCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHBhcmVudCA9IHRhcmdldE5vZGUucGFyZW50Tm9kZTtcbiAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHBhcmVudC5yZXBsYWNlQ2hpbGQocmVwbGFjZW1lbnQsIHRhcmdldE5vZGUpO1xuICAgIHJldHVybiB0cnVlO1xufVxuZXhwb3J0cy5yZXBsYWNlTm9kZUlmID0gcmVwbGFjZU5vZGVJZjtcbmZ1bmN0aW9uIGdldE5hbWVzcGFjZShuYW1lKSB7XG4gICAgaWYgKG5hbWUubGFzdEluZGV4T2YoJ3htbDonLCAwKSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gJ2h0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZSc7XG4gICAgfVxuICAgIGlmIChuYW1lLmxhc3RJbmRleE9mKCd4bGluazonLCAwKSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5nZXROYW1lc3BhY2UgPSBnZXROYW1lc3BhY2U7XG5mdW5jdGlvbiBhcHBseUF0dHIoZWwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc3QgYXR0ck5TID0gZ2V0TmFtZXNwYWNlKG5hbWUpO1xuICAgICAgICBpZiAoYXR0ck5TKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhhdHRyTlMsIG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5hcHBseUF0dHIgPSBhcHBseUF0dHI7XG5mdW5jdGlvbiBhcHBseUF0dHJzKGVsLCB2YWx1ZXMpIHtcbiAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWVzKSB7XG4gICAgICAgIGlmICh2YWx1ZXNba2V5XSA9PSBudWxsKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlc1trZXldKTtcbiAgICB9XG59XG5leHBvcnRzLmFwcGx5QXR0cnMgPSBhcHBseUF0dHJzO1xuZnVuY3Rpb24gYXBwbHlQcm9wKGVsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGVsW25hbWVdID0gdmFsdWU7XG59XG5leHBvcnRzLmFwcGx5UHJvcCA9IGFwcGx5UHJvcDtcbmZ1bmN0aW9uIHNldFN0eWxlVmFsdWUoc3R5bGUsIHByb3AsIHZhbHVlKSB7XG4gICAgaWYgKHByb3AuaW5kZXhPZignLScpID49IDApIHtcbiAgICAgICAgc3R5bGUuc2V0UHJvcGVydHkocHJvcCwgdmFsdWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3R5bGVbcHJvcF0gPSB2YWx1ZTtcbiAgICB9XG59XG5leHBvcnRzLnNldFN0eWxlVmFsdWUgPSBzZXRTdHlsZVZhbHVlO1xuZnVuY3Rpb24gYXBwbHlTVkdTdHlsZShlbCwgbmFtZSwgc3R5bGUpIHtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gJyc7XG4gICAgICAgIGNvbnN0IGVsU3R5bGUgPSBlbC5zdHlsZTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAodXRpbHNfMS5oYXMoc3R5bGUsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgc2V0U3R5bGVWYWx1ZShlbFN0eWxlLCBwcm9wLCBzdHlsZVtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFwcGx5U1ZHU3R5bGUgPSBhcHBseVNWR1N0eWxlO1xuZnVuY3Rpb24gYXBwbHlTdHlsZShlbCwgbmFtZSwgc3R5bGUpIHtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gJyc7XG4gICAgICAgIGNvbnN0IGVsU3R5bGUgPSBlbC5zdHlsZTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAodXRpbHNfMS5oYXMoc3R5bGUsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgc2V0U3R5bGVWYWx1ZShlbFN0eWxlLCBwcm9wLCBzdHlsZVtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFwcGx5U3R5bGUgPSBhcHBseVN0eWxlO1xuZnVuY3Rpb24gYXBwbHlTdHlsZXMoZWwsIHN0eWxlKSB7XG4gICAgaWYgKHR5cGVvZiBzdHlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9ICcnO1xuICAgICAgICBjb25zdCBlbFN0eWxlID0gZWwuc3R5bGU7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBpbiBzdHlsZSkge1xuICAgICAgICAgICAgaWYgKHV0aWxzXzEuaGFzKHN0eWxlLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIHNldFN0eWxlVmFsdWUoZWxTdHlsZSwgcHJvcCwgc3R5bGVbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5hcHBseVN0eWxlcyA9IGFwcGx5U3R5bGVzO1xuZnVuY3Rpb24gYXBwbHlTVkdTdHlsZXMoZWwsIHN0eWxlKSB7XG4gICAgaWYgKHR5cGVvZiBzdHlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9ICcnO1xuICAgICAgICBjb25zdCBlbFN0eWxlID0gZWwuc3R5bGU7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBpbiBzdHlsZSkge1xuICAgICAgICAgICAgaWYgKHV0aWxzXzEuaGFzKHN0eWxlLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIHNldFN0eWxlVmFsdWUoZWxTdHlsZSwgcHJvcCwgc3R5bGVbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5hcHBseVNWR1N0eWxlcyA9IGFwcGx5U1ZHU3R5bGVzO1xuZnVuY3Rpb24gYXBwbHlBdHRyaWJ1dGVUeXBlZChlbCwgbmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICAgIGlmICh0eXBlID09PSAnb2JqZWN0JyB8fCB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGFwcGx5UHJvcChlbCwgbmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXBwbHlBdHRyKGVsLCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuZXhwb3J0cy5hcHBseUF0dHJpYnV0ZVR5cGVkID0gYXBwbHlBdHRyaWJ1dGVUeXBlZDtcbmZ1bmN0aW9uIGdldE5hbWVzcGFjZUZvclRhZyh0YWcsIHBhcmVudCkge1xuICAgIGlmICh0YWcgPT09ICdzdmcnKSB7XG4gICAgICAgIHJldHVybiAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuICAgIH1cbiAgICBpZiAodGFnID09PSAnbWF0aCcpIHtcbiAgICAgICAgcmV0dXJuICdodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MJztcbiAgICB9XG4gICAgaWYgKHBhcmVudCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbn1cbmV4cG9ydHMuZ2V0TmFtZXNwYWNlRm9yVGFnID0gZ2V0TmFtZXNwYWNlRm9yVGFnO1xuZnVuY3Rpb24gcmVjb3JkQXR0cmlidXRlcyhub2RlKSB7XG4gICAgY29uc3QgYXR0cnMgPSB7fTtcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gbm9kZS5hdHRyaWJ1dGVzO1xuICAgIGNvbnN0IGxlbmd0aCA9IGF0dHJpYnV0ZXMubGVuZ3RoO1xuICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBhdHRycztcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDAsIGogPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEsIGogKz0gMikge1xuICAgICAgICBjb25zdCBhdHRyID0gYXR0cmlidXRlc1tpXTtcbiAgICAgICAgYXR0cnNbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBhdHRycztcbn1cbmV4cG9ydHMucmVjb3JkQXR0cmlidXRlcyA9IHJlY29yZEF0dHJpYnV0ZXM7XG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KGRvYywgbmFtZU9yQ3Rvciwga2V5LCBjb250ZW50LCBhdHRyaWJ1dGVzLCBuYW1lc3BhY2UpIHtcbiAgICBsZXQgZWw7XG4gICAgaWYgKHR5cGVvZiBuYW1lT3JDdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGVsID0gbmV3IG5hbWVPckN0b3IoKTtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH1cbiAgICBuYW1lc3BhY2UgPSBuYW1lc3BhY2UudHJpbSgpO1xuICAgIGlmIChuYW1lc3BhY2UubGVuZ3RoID4gMCkge1xuICAgICAgICBzd2l0Y2ggKG5hbWVPckN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N2Zyc6XG4gICAgICAgICAgICAgICAgZWwgPSBkb2MuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIG5hbWVPckN0b3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbWF0aCc6XG4gICAgICAgICAgICAgICAgZWwgPSBkb2MuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MJywgbmFtZU9yQ3Rvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2UsIG5hbWVPckN0b3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbCA9IGRvYy5jcmVhdGVFbGVtZW50KG5hbWVPckN0b3IpO1xuICAgIH1cbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ19rZXknLCBrZXkpO1xuICAgIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGFwcGx5QXR0cnMoZWwsIGF0dHJpYnV0ZXMpO1xuICAgIH1cbiAgICBpZiAoY29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cbmV4cG9ydHMuY3JlYXRlRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQ7XG5mdW5jdGlvbiBjcmVhdGVUZXh0KGRvYywgdGV4dCwga2V5KSB7XG4gICAgY29uc3Qgbm9kZSA9IGRvYy5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbiAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKG5vZGUsICdrZXknLCBrZXkpO1xuICAgIHJldHVybiBub2RlO1xufVxuZXhwb3J0cy5jcmVhdGVUZXh0ID0gY3JlYXRlVGV4dDtcbmZ1bmN0aW9uIHJlbW92ZUZyb21Ob2RlKGZyb21Ob2RlLCBlbmROb2RlKSB7XG4gICAgY29uc3QgcGFyZW50Tm9kZSA9IGZyb21Ob2RlLnBhcmVudE5vZGU7XG4gICAgbGV0IGNoaWxkID0gZnJvbU5vZGU7XG4gICAgd2hpbGUgKGNoaWxkICE9PSBlbmROb2RlKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBjaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG4gICAgICAgIGNoaWxkID0gbmV4dDtcbiAgICB9XG59XG5leHBvcnRzLnJlbW92ZUZyb21Ob2RlID0gcmVtb3ZlRnJvbU5vZGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kb20uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgT2JqZWN0cztcbihmdW5jdGlvbiAoT2JqZWN0cykge1xuICAgIGZ1bmN0aW9uIFBhdGNoV2l0aChlbGVtLCBhdHRyTmFtZSwgYXR0cnMpIHtcbiAgICAgICAgZWxlbVthdHRyTmFtZV0gPSBhdHRycztcbiAgICB9XG4gICAgT2JqZWN0cy5QYXRjaFdpdGggPSBQYXRjaFdpdGg7XG4gICAgZnVuY3Rpb24gR2V0QXR0cldpdGgoZWxlbSwgYXR0ck5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsZW1bYXR0ck5hbWVdO1xuICAgIH1cbiAgICBPYmplY3RzLkdldEF0dHJXaXRoID0gR2V0QXR0cldpdGg7XG4gICAgZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbSA9PT0gbnVsbCB8fCBlbGVtID09PSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIE9iamVjdHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcbiAgICBmdW5jdGlvbiBpc0FueShlbGVtLCAuLi52YWx1ZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaW5kZXggb2YgdmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAoZWxlbSA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIE9iamVjdHMuaXNBbnkgPSBpc0FueTtcbn0pKE9iamVjdHMgPSBleHBvcnRzLk9iamVjdHMgfHwgKGV4cG9ydHMuT2JqZWN0cyA9IHt9KSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1leHRlbnNpb25zLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZmV0Y2ggPSByZXF1aXJlKFwid2hhdHdnLWZldGNoXCIpO1xuZXhwb3J0cy5mZXRjaEFQSSA9IHtcbiAgICBmZXRjaDogc2VsZi5mZXRjaCxcbiAgICBIZWFkZXJzOiBzZWxmLkhlYWRlcnMsXG4gICAgUmVxdWVzdDogc2VsZi5SZXF1ZXN0LFxuICAgIFJlc3BvbnNlOiBzZWxmLlJlc3BvbnNlLFxuICAgIERPTUV4Y2VwdGlvbjogc2VsZi5ET01FeGNlcHRpb24sXG59O1xuaWYgKCFzZWxmLmZldGNoKSB7XG4gICAgZXhwb3J0cy5mZXRjaEFQSS5mZXRjaCA9IGZldGNoLmZldGNoO1xuICAgIGV4cG9ydHMuZmV0Y2hBUEkuSGVhZGVycyA9IGZldGNoLkhlYWRlcnM7XG4gICAgZXhwb3J0cy5mZXRjaEFQSS5SZXF1ZXN0ID0gZmV0Y2guUmVxdWVzdDtcbiAgICBleHBvcnRzLmZldGNoQVBJLlJlc3BvbnNlID0gZmV0Y2guUmVzcG9uc2U7XG4gICAgZXhwb3J0cy5mZXRjaEFQSS5ET01FeGNlcHRpb24gPSBmZXRjaC5ET01FeGNlcHRpb247XG4gICAgc2VsZi5mZXRjaCA9IGZldGNoLmZldGNoO1xuICAgIHNlbGYuSGVhZGVycyA9IGZldGNoLkhlYWRlcnM7XG4gICAgc2VsZi5SZXF1ZXN0ID0gZmV0Y2guUmVxdWVzdDtcbiAgICBzZWxmLlJlc3BvbnNlID0gZmV0Y2guUmVzcG9uc2U7XG4gICAgc2VsZi5ET01FeGNlcHRpb24gPSBmZXRjaC5ET01FeGNlcHRpb247XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1mZXRjaC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHt9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHR0cC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmZ1bmN0aW9uIExpbmVhclN1bShwMCwgcDEsIHQpIHtcbiAgICByZXR1cm4gKHAxIC0gcDApICogdCArIHAwO1xufVxuZXhwb3J0cy5MaW5lYXJTdW0gPSBMaW5lYXJTdW07XG5mdW5jdGlvbiBCZXJuc3RlaW5EaXZpc2lvbihuLCBpKSB7XG4gICAgY29uc3QgZmMgPSBGYWN0b3JpYWxHZW5lcmF0b3IoKTtcbiAgICByZXR1cm4gZmMobikgLyBmYyhpKSAvIGZjKG4gLSBpKTtcbn1cbmV4cG9ydHMuQmVybnN0ZWluRGl2aXNpb24gPSBCZXJuc3RlaW5EaXZpc2lvbjtcbmZ1bmN0aW9uIEZhY3RvcmlhbEdlbmVyYXRvcigpIHtcbiAgICBjb25zdCBhID0gWzFdO1xuICAgIHJldHVybiBmdW5jdGlvbiAobikge1xuICAgICAgICBsZXQgcyA9IDE7XG4gICAgICAgIGlmIChhW25dKSB7XG4gICAgICAgICAgICByZXR1cm4gYVtuXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gbjsgaSA+IDE7IGktLSkge1xuICAgICAgICAgICAgcyAqPSBpO1xuICAgICAgICB9XG4gICAgICAgIGFbbl0gPSBzO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xufVxuZXhwb3J0cy5GYWN0b3JpYWxHZW5lcmF0b3IgPSBGYWN0b3JpYWxHZW5lcmF0b3I7XG5mdW5jdGlvbiBDYXRtdWxsUm9tU3VtKHAwLCBwMSwgcDIsIHAzLCB0KSB7XG4gICAgdmFyIHYwID0gKHAyIC0gcDApICogMC41O1xuICAgIHZhciB2MSA9IChwMyAtIHAxKSAqIDAuNTtcbiAgICB2YXIgdDIgPSB0ICogdDtcbiAgICB2YXIgdDMgPSB0ICogdDI7XG4gICAgcmV0dXJuICgyICogcDEgLSAyICogcDIgKyB2MCArIHYxKSAqIHQzICsgKC0zICogcDEgKyAzICogcDIgLSAyICogdjAgLSB2MSkgKiB0MiArIHYwICogdCArIHAxO1xufVxuZXhwb3J0cy5DYXRtdWxsUm9tU3VtID0gQ2F0bXVsbFJvbVN1bTtcbmZ1bmN0aW9uIExpbmVhcih2LCBrKSB7XG4gICAgY29uc3QgbSA9IHYubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBmID0gbSAqIGs7XG4gICAgY29uc3QgaSA9IE1hdGguZmxvb3IoZik7XG4gICAgaWYgKGsgPCAwKSB7XG4gICAgICAgIHJldHVybiBMaW5lYXJTdW0odlswXSwgdlsxXSwgZik7XG4gICAgfVxuICAgIGlmIChrID4gMSkge1xuICAgICAgICByZXR1cm4gTGluZWFyU3VtKHZbbV0sIHZbbSAtIDFdLCBtIC0gZik7XG4gICAgfVxuICAgIHJldHVybiBMaW5lYXJTdW0odltpXSwgdltpICsgMSA+IG0gPyBtIDogaSArIDFdLCBmIC0gaSk7XG59XG5leHBvcnRzLkxpbmVhciA9IExpbmVhcjtcbmZ1bmN0aW9uIEJlemllcih2LCBrKSB7XG4gICAgY29uc3QgbiA9IHYubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBwdyA9IE1hdGgucG93O1xuICAgIGxldCBiID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBuOyBpKyspIHtcbiAgICAgICAgYiArPSBwdygxIC0gaywgbiAtIGkpICogcHcoaywgaSkgKiB2W2ldICogQmVybnN0ZWluRGl2aXNpb24obiwgaSk7XG4gICAgfVxuICAgIHJldHVybiBiO1xufVxuZXhwb3J0cy5CZXppZXIgPSBCZXppZXI7XG5mdW5jdGlvbiBDYXRtdWxsUm9tKHYsIGspIHtcbiAgICBjb25zdCBtID0gdi5sZW5ndGggLSAxO1xuICAgIGxldCBmID0gbSAqIGs7XG4gICAgbGV0IGkgPSBNYXRoLmZsb29yKGYpO1xuICAgIGlmICh2WzBdID09PSB2W21dKSB7XG4gICAgICAgIGlmIChrIDwgMCkge1xuICAgICAgICAgICAgZiA9IG0gKiAoMSArIGspO1xuICAgICAgICAgICAgaSA9IE1hdGguZmxvb3IoZik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENhdG11bGxSb21TdW0odlsoaSAtIDEgKyBtKSAlIG1dLCB2W2ldLCB2WyhpICsgMSkgJSBtXSwgdlsoaSArIDIpICUgbV0sIGYgLSBpKTtcbiAgICB9XG4gICAgaWYgKGsgPCAwKSB7XG4gICAgICAgIHJldHVybiB2WzBdIC0gKENhdG11bGxSb21TdW0odlswXSwgdlswXSwgdlsxXSwgdlsxXSwgLWYpIC0gdlswXSk7XG4gICAgfVxuICAgIGlmIChrID4gMSkge1xuICAgICAgICByZXR1cm4gdlttXSAtIChDYXRtdWxsUm9tU3VtKHZbbV0sIHZbbV0sIHZbbSAtIDFdLCB2W20gLSAxXSwgZiAtIG0pIC0gdlttXSk7XG4gICAgfVxuICAgIHJldHVybiBDYXRtdWxsUm9tU3VtKHZbaSA/IGkgLSAxIDogMF0sIHZbaV0sIHZbbSA8IGkgKyAxID8gbSA6IGkgKyAxXSwgdlttIDwgaSArIDIgPyBtIDogaSArIDJdLCBmIC0gaSk7XG59XG5leHBvcnRzLkNhdG11bGxSb20gPSBDYXRtdWxsUm9tO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW50ZXJwb2xhdGlvbnMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBwYXRjaCA9IHJlcXVpcmUoXCIuL3BhdGNoXCIpO1xuY29uc3QgZG9tID0gcmVxdWlyZShcIi4vZG9tXCIpO1xuY2xhc3MgRE9NTW91bnQge1xuICAgIGNvbnN0cnVjdG9yKGRvY3VtZW50LCB0YXJnZXQpIHtcbiAgICAgICAgdGhpcy5kb2MgPSBkb2N1bWVudDtcbiAgICAgICAgdGhpcy5ldmVudHMgPSB7fTtcbiAgICAgICAgdGhpcy5oYW5kbGVyID0gdGhpcy5oYW5kbGVFdmVudC5iaW5kKHRoaXMpO1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldFNlbGVjdG9yID0gdGFyZ2V0O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZG9jLnF1ZXJ5U2VsZWN0b3IodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG51bGwgfHwgbm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmFibGUgdG8gbG9jYXRlIG5vZGUgZm9yICR7eyB0YXJnZXRTZWxlY3RvciB9fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5tb3VudE5vZGUgPSBub2RlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubW91bnROb2RlID0gdGFyZ2V0O1xuICAgIH1cbiAgICBoYW5kbGVFdmVudChldmVudCkgeyB9XG4gICAgcGF0Y2goY2hhbmdlKSB7XG4gICAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGNoYW5nZTtcbiAgICAgICAgICAgIHBhdGNoLlBhdGNoRE9NVHJlZShmcmFnbWVudCwgdGhpcy5tb3VudE5vZGUsIHBhdGNoLkRlZmF1bHROb2RlRGljdGF0b3IsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJOb2RlRXZlbnRzKGZyYWdtZW50KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNoYW5nZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIG5vZGUuaW5uZXJIVE1MID0gY2hhbmdlO1xuICAgICAgICAgICAgcGF0Y2guUGF0Y2hET01UcmVlKG5vZGUsIHRoaXMubW91bnROb2RlLCBwYXRjaC5EZWZhdWx0Tm9kZURpY3RhdG9yLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyTm9kZUV2ZW50cyhub2RlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhdGNoLmlzSlNPTk5vZGUoY2hhbmdlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vZGUgPSBjaGFuZ2U7XG4gICAgICAgIHBhdGNoLlBhdGNoSlNPTk5vZGVUcmVlKG5vZGUsIHRoaXMubW91bnROb2RlLCBwYXRjaC5EZWZhdWx0SlNPTkRpY3RhdG9yLCBwYXRjaC5EZWZhdWx0SlNPTk1ha2VyKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckpTT05Ob2RlRXZlbnRzKG5vZGUpO1xuICAgIH1cbiAgICBwYXRjaExpc3QoY2hhbmdlcykge1xuICAgICAgICBjaGFuZ2VzLmZvckVhY2godGhpcy5wYXRjaC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgc3RyZWFtKGNoYW5nZXMpIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSBKU09OLnBhcnNlKGNoYW5nZXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdHJlYW1MaXN0KG5vZGVzKTtcbiAgICB9XG4gICAgc3RyZWFtTGlzdChjaGFuZ2VzKSB7XG4gICAgICAgIHBhdGNoLlN0cmVhbUpTT05Ob2RlcyhjaGFuZ2VzLCB0aGlzLm1vdW50Tm9kZSwgcGF0Y2guRGVmYXVsdEpTT05EaWN0YXRvciwgcGF0Y2guRGVmYXVsdEpTT05NYWtlcik7XG4gICAgICAgIGNoYW5nZXMuZm9yRWFjaCh0aGlzLnJlZ2lzdGVySlNPTk5vZGVFdmVudHMuYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIHJlZ2lzdGVyTm9kZUV2ZW50cyhub2RlKSB7XG4gICAgICAgIGNvbnN0IGJpbmRlciA9IHRoaXM7XG4gICAgICAgIGRvbS5hcHBseUVhY2hOb2RlKG5vZGUsIGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICBpZiAobi5ub2RlVHlwZSAhPT0gZG9tLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBub2RlO1xuICAgICAgICAgICAgY29uc3QgZXZlbnRzID0gZWxlbS5nZXRBdHRyaWJ1dGUoJ2V2ZW50cycpO1xuICAgICAgICAgICAgZXZlbnRzLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAoZGVzYykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyID0gZGVzYy5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgIGlmIChvcmRlci5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluZGVyLnJlZ2lzdGVyRXZlbnQob3JkZXJbMF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVnaXN0ZXJKU09OTm9kZUV2ZW50cyhub2RlKSB7XG4gICAgICAgIGNvbnN0IGJpbmRlciA9IHRoaXM7XG4gICAgICAgIHBhdGNoLmFwcGx5SlNPTk5vZGVGdW5jdGlvbihub2RlLCBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgaWYgKG4ucmVtb3ZlZCkge1xuICAgICAgICAgICAgICAgIG4uZXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGRlc2MpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluZGVyLnVucmVnaXN0ZXJFdmVudChkZXNjLk5hbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG4uZXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGRlc2MpIHtcbiAgICAgICAgICAgICAgICBiaW5kZXIucmVnaXN0ZXJFdmVudChkZXNjLk5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZWdpc3RlckV2ZW50KGV2ZW50TmFtZSkge1xuICAgICAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubW91bnROb2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCB0aGlzLmhhbmRsZXIsIHRydWUpO1xuICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gdHJ1ZTtcbiAgICB9XG4gICAgdW5yZWdpc3RlckV2ZW50KGV2ZW50TmFtZSkge1xuICAgICAgICBpZiAoIXRoaXMuZXZlbnRzW2V2ZW50TmFtZV0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm1vdW50Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcy5oYW5kbGVyLCB0cnVlKTtcbiAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IGZhbHNlO1xuICAgIH1cbn1cbmV4cG9ydHMuRE9NTW91bnQgPSBET01Nb3VudDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1vdW50LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZG9tID0gcmVxdWlyZShcIi4vZG9tXCIpO1xuY29uc3QgZXh0cyA9IHJlcXVpcmUoXCIuL2V4dGVuc2lvbnNcIik7XG5jb25zdCBkb21fMSA9IHJlcXVpcmUoXCIuL2RvbVwiKTtcbmV4cG9ydHMuRGVmYXVsdE5vZGVEaWN0YXRvciA9IHtcbiAgICBTYW1lOiAobiwgbSkgPT4ge1xuICAgICAgICByZXR1cm4gbi5ub2RlVHlwZSA9PSBtLm5vZGVUeXBlICYmIG4ubm9kZU5hbWUgPT0gbS5ub2RlTmFtZTtcbiAgICB9LFxuICAgIENoYW5nZWQ6IChuLCBtKSA9PiB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxufTtcbmZ1bmN0aW9uIGFwcGx5SlNPTk5vZGVGdW5jdGlvbihub2RlLCBmbikge1xuICAgIGZuKG5vZGUpO1xuICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgYXBwbHlKU09OTm9kZUZ1bmN0aW9uKGNoaWxkLCBmbik7XG4gICAgfSk7XG59XG5leHBvcnRzLmFwcGx5SlNPTk5vZGVGdW5jdGlvbiA9IGFwcGx5SlNPTk5vZGVGdW5jdGlvbjtcbmZ1bmN0aW9uIGFwcGx5SlNPTk5vZGVLaWRzRnVuY3Rpb24obm9kZSwgZm4pIHtcbiAgICBub2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGFwcGx5SlNPTk5vZGVGdW5jdGlvbihjaGlsZCwgZm4pO1xuICAgIH0pO1xuICAgIGZuKG5vZGUpO1xufVxuZXhwb3J0cy5hcHBseUpTT05Ob2RlS2lkc0Z1bmN0aW9uID0gYXBwbHlKU09OTm9kZUtpZHNGdW5jdGlvbjtcbmZ1bmN0aW9uIGlzSlNPTk5vZGUobikge1xuICAgIGNvbnN0IGhhc0lEID0gdHlwZW9mIG4uaWQgIT09ICd1bmRlZmluZWQnO1xuICAgIGNvbnN0IGhhc1JlZiA9IHR5cGVvZiBuLnJlZiAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgY29uc3QgaGFzVGlkID0gdHlwZW9mIG4udGlkICE9PSAndW5kZWZpbmVkJztcbiAgICBjb25zdCBoYXNUeXBlTmFtZSA9IHR5cGVvZiBuLnR5cGVOYW1lICE9PSAndW5kZWZpbmVkJztcbiAgICByZXR1cm4gaGFzSUQgJiYgaGFzUmVmICYmIGhhc1R5cGVOYW1lICYmIGhhc1RpZDtcbn1cbmV4cG9ydHMuaXNKU09OTm9kZSA9IGlzSlNPTk5vZGU7XG5mdW5jdGlvbiBmaW5kRWxlbWVudChkZXNjLCBwYXJlbnQpIHtcbiAgICBjb25zdCBzZWxlY3RvciA9IGRlc2MubmFtZSArICcjJyArIGRlc2MuaWQ7XG4gICAgY29uc3QgdGFyZ2V0cyA9IHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICBpZiAodGFyZ2V0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbGV0IGF0dHJTZWxlY3RvciA9IGRlc2MubmFtZSArIGBbX3RpZD0nJHtkZXNjLnRpZH0nXWA7XG4gICAgICAgIGxldCB0YXJnZXQgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihhdHRyU2VsZWN0b3IpO1xuICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICB9XG4gICAgICAgIGF0dHJTZWxlY3RvciA9IGRlc2MubmFtZSArIGBbX2F0aWQ9JyR7ZGVzYy5hdGlkfSddYDtcbiAgICAgICAgdGFyZ2V0ID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoYXR0clNlbGVjdG9yKTtcbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgfVxuICAgICAgICBhdHRyU2VsZWN0b3IgPSBkZXNjLm5hbWUgKyBgW19yZWY9JyR7ZGVzYy5yZWZ9J11gO1xuICAgICAgICByZXR1cm4gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoYXR0clNlbGVjdG9yKTtcbiAgICB9XG4gICAgaWYgKHRhcmdldHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXRzWzBdO1xuICAgIH1cbiAgICBjb25zdCB0b3RhbCA9IHRhcmdldHMubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWw7IGkrKykge1xuICAgICAgICBjb25zdCBlbGVtID0gdGFyZ2V0cy5pdGVtKGkpO1xuICAgICAgICBpZiAoZWxlbS5nZXRBdHRyaWJ1dGUoJ190aWQnKSA9PT0gZGVzYy50aWQpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtLmdldEF0dHJpYnV0ZSgnX2F0aWQnKSA9PT0gZGVzYy5hdGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbS5nZXRBdHRyaWJ1dGUoJ19yZWYnKSA9PT0gZGVzYy5yZWYpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5maW5kRWxlbWVudCA9IGZpbmRFbGVtZW50O1xuZnVuY3Rpb24gZmluZEVsZW1lbnRieVJlZihyZWYsIHBhcmVudCkge1xuICAgIGNvbnN0IGlkcyA9IHJlZi5zcGxpdCgnLycpLm1hcChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBpZiAoZWxlbS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcjJyArIGVsZW07XG4gICAgfSk7XG4gICAgaWYgKGlkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChpZHNbMF0gPT09ICcnIHx8IGlkc1swXS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIGlkcy5zaGlmdCgpO1xuICAgIH1cbiAgICBjb25zdCBmaXJzdCA9IGlkc1swXTtcbiAgICBpZiAocGFyZW50LmlkID09IGZpcnN0LnN1YnN0cigxKSkge1xuICAgICAgICBpZHMuc2hpZnQoKTtcbiAgICB9XG4gICAgbGV0IGN1ciA9IHBhcmVudC5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbn1cbmV4cG9ydHMuZmluZEVsZW1lbnRieVJlZiA9IGZpbmRFbGVtZW50YnlSZWY7XG5mdW5jdGlvbiBmaW5kRWxlbWVudFBhcmVudGJ5UmVmKHJlZiwgcGFyZW50KSB7XG4gICAgY29uc3QgaWRzID0gcmVmLnNwbGl0KCcvJykubWFwKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGlmIChlbGVtLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyMnICsgZWxlbTtcbiAgICB9KTtcbiAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKGlkc1swXSA9PT0gJycgfHwgaWRzWzBdLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgaWRzLnNoaWZ0KCk7XG4gICAgfVxuICAgIGlkcy5wb3AoKTtcbiAgICBjb25zdCBmaXJzdCA9IGlkc1swXTtcbiAgICBpZiAocGFyZW50LmlkID09IGZpcnN0LnN1YnN0cigxKSkge1xuICAgICAgICBpZHMuc2hpZnQoKTtcbiAgICB9XG4gICAgbGV0IGN1ciA9IHBhcmVudC5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbn1cbmV4cG9ydHMuZmluZEVsZW1lbnRQYXJlbnRieVJlZiA9IGZpbmRFbGVtZW50UGFyZW50YnlSZWY7XG5leHBvcnRzLkRlZmF1bHRKU09ORGljdGF0b3IgPSB7XG4gICAgU2FtZTogKG4sIG0pID0+IHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgQ2hhbmdlZDogKG4sIG0pID0+IHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG59O1xuZXhwb3J0cy5EZWZhdWx0SlNPTk1ha2VyID0ge1xuICAgIE1ha2U6IGpzb25NYWtlcixcbn07XG5mdW5jdGlvbiBqc29uTWFrZXIoZG9jLCBkZXNjTm9kZSwgc2hhbGxvdywgc2tpcFJlbW92ZWQpIHtcbiAgICBpZiAoZGVzY05vZGUudHlwZSA9PT0gZG9tXzEuQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBkb2MuY3JlYXRlQ29tbWVudChkZXNjTm9kZS5jb250ZW50KTtcbiAgICAgICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX2lkJywgZGVzY05vZGUuaWQpO1xuICAgICAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKG5vZGUsICdfcmVmJywgZGVzY05vZGUucmVmKTtcbiAgICAgICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX3RpZCcsIGRlc2NOb2RlLnRpZCk7XG4gICAgICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19hdGlkJywgZGVzY05vZGUuYXRpZCk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBpZiAoZGVzY05vZGUudHlwZSA9PT0gZG9tXzEuVEVYVF9OT0RFKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBkb2MuY3JlYXRlVGV4dE5vZGUoZGVzY05vZGUuY29udGVudCk7XG4gICAgICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19pZCcsIGRlc2NOb2RlLmlkKTtcbiAgICAgICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX3JlZicsIGRlc2NOb2RlLnJlZik7XG4gICAgICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ190aWQnLCBkZXNjTm9kZS50aWQpO1xuICAgICAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKG5vZGUsICdfYXRpZCcsIGRlc2NOb2RlLmF0aWQpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbGV0IG5vZGU7XG4gICAgaWYgKGRlc2NOb2RlLm5hbWVzcGFjZS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGRlc2NOb2RlLm5hbWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50TlMoZGVzY05vZGUubmFtZXNwYWNlLCBkZXNjTm9kZS5uYW1lKTtcbiAgICB9XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX2lkJywgZGVzY05vZGUuaWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19yZWYnLCBkZXNjTm9kZS5yZWYpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ190aWQnLCBkZXNjTm9kZS50aWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19hdGlkJywgZGVzY05vZGUuYXRpZCk7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2lkJywgZGVzY05vZGUuaWQpO1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKCdfdGlkJywgZGVzY05vZGUudGlkKTtcbiAgICBub2RlLnNldEF0dHJpYnV0ZSgnX3JlZicsIGRlc2NOb2RlLnJlZik7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ19hdGlkJywgZGVzY05vZGUuYXRpZCk7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2V2ZW50cycsIEJ1aWxkRXZlbnQoZGVzY05vZGUuZXZlbnRzKSk7XG4gICAgZGVzY05vZGUuYXR0cnMuZm9yRWFjaChmdW5jdGlvbiBhdHRycyhhdHRyKSB7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dHIuS2V5LCBhdHRyLlZhbHVlKTtcbiAgICB9KTtcbiAgICBpZiAoZGVzY05vZGUucmVtb3ZlZCkge1xuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgnX3JlbW92ZWQnLCAndHJ1ZScpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93KSB7XG4gICAgICAgIGRlc2NOb2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGtpZEpTT04pIHtcbiAgICAgICAgICAgIGlmIChza2lwUmVtb3ZlZCAmJiBraWRKU09OLnJlbW92ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGpzb25NYWtlcihkb2MsIGtpZEpTT04sIHNoYWxsb3csIHNraXBSZW1vdmVkKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbn1cbmV4cG9ydHMuanNvbk1ha2VyID0ganNvbk1ha2VyO1xuZnVuY3Rpb24gQnVpbGRFdmVudChldmVudHMpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBuZXcgQXJyYXkoKTtcbiAgICBldmVudHMuZm9yRWFjaChmdW5jdGlvbiBhdHRycyhhdHRyKSB7XG4gICAgICAgIGNvbnN0IGV2ZW50TmFtZSA9IGF0dHIuTmFtZSArICctJyArIChhdHRyLlByZXZlbnREZWZhdWx0ID8gJzEnIDogJzAnKSArIChhdHRyLlN0b3BQcm9wYWdhdGlvbiA/ICcxJyA6ICcwJyk7XG4gICAgICAgIHZhbHVlcy5wdXNoKGV2ZW50TmFtZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbHVlcy5qb2luKCcgJyk7XG59XG5leHBvcnRzLkJ1aWxkRXZlbnQgPSBCdWlsZEV2ZW50O1xuZnVuY3Rpb24gUGF0Y2hKU09OTm9kZVRyZWUoZnJhZ21lbnQsIG1vdW50LCBkaWN0YXRvciwgbWFrZXIpIHtcbiAgICBsZXQgdGFyZ2V0Tm9kZSA9IGZpbmRFbGVtZW50KGZyYWdtZW50LCBtb3VudCk7XG4gICAgaWYgKGV4dHMuT2JqZWN0cy5pc051bGxPclVuZGVmaW5lZCh0YXJnZXROb2RlKSkge1xuICAgICAgICBjb25zdCB0Tm9kZSA9IG1ha2VyLk1ha2UoZG9jdW1lbnQsIGZyYWdtZW50LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIG1vdW50LmFwcGVuZENoaWxkKHRhcmdldE5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIFBhdGNoSlNPTk5vZGUoZnJhZ21lbnQsIHRhcmdldE5vZGUsIGRpY3RhdG9yLCBtYWtlcik7XG59XG5leHBvcnRzLlBhdGNoSlNPTk5vZGVUcmVlID0gUGF0Y2hKU09OTm9kZVRyZWU7XG5mdW5jdGlvbiBQYXRjaEpTT05Ob2RlKGZyYWdtZW50LCB0YXJnZXROb2RlLCBkaWN0YXRvciwgbWFrZXIpIHtcbiAgICBpZiAoIWRpY3RhdG9yLlNhbWUodGFyZ2V0Tm9kZSwgZnJhZ21lbnQpKSB7XG4gICAgICAgIGNvbnN0IHROb2RlID0gbWFrZXIuTWFrZShkb2N1bWVudCwgZnJhZ21lbnQsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgZG9tLnJlcGxhY2VOb2RlKHRhcmdldE5vZGUucGFyZW50Tm9kZSwgdGFyZ2V0Tm9kZSwgdE5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghZGljdGF0b3IuQ2hhbmdlZCh0YXJnZXROb2RlLCBmcmFnbWVudCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBQYXRjaEpTT05BdHRyaWJ1dGVzKGZyYWdtZW50LCB0YXJnZXROb2RlKTtcbiAgICBjb25zdCB0b3RhbEtpZHMgPSB0YXJnZXROb2RlLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgIGNvbnN0IGZyYWdtZW50S2lkcyA9IGZyYWdtZW50LmNoaWxkcmVuLmxlbmd0aDtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yICg7IGkgPCB0b3RhbEtpZHM7IGkrKykge1xuICAgICAgICBjb25zdCBjaGlsZE5vZGUgPSB0YXJnZXROb2RlLmNoaWxkTm9kZXNbaV07XG4gICAgICAgIGlmIChpID49IGZyYWdtZW50S2lkcykge1xuICAgICAgICAgICAgY2hpbGROb2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hpbGRGcmFnbWVudCA9IGZyYWdtZW50LmNoaWxkcmVuW2ldO1xuICAgICAgICBQYXRjaEpTT05Ob2RlKGNoaWxkRnJhZ21lbnQsIGNoaWxkTm9kZSwgZGljdGF0b3IsIG1ha2VyKTtcbiAgICB9XG4gICAgZm9yICg7IGkgPCBmcmFnbWVudEtpZHM7IGkrKykge1xuICAgICAgICBjb25zdCB0Tm9kZSA9IG1ha2VyLk1ha2UoZG9jdW1lbnQsIGZyYWdtZW50LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIHRhcmdldE5vZGUuYXBwZW5kQ2hpbGQodE5vZGUpO1xuICAgIH1cbiAgICByZXR1cm47XG59XG5leHBvcnRzLlBhdGNoSlNPTk5vZGUgPSBQYXRjaEpTT05Ob2RlO1xuZnVuY3Rpb24gU3RyZWFtSlNPTk5vZGVzKGZyYWdtZW50LCBtb3VudCwgZGljdGF0b3IsIG1ha2VyKSB7XG4gICAgY29uc3QgY2hhbmdlcyA9IGZyYWdtZW50LmZpbHRlcihmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICByZXR1cm4gIWVsZW0ucmVtb3ZlZDtcbiAgICB9KTtcbiAgICBmcmFnbWVudFxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGlmICghZWxlbS5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGZpbHRlcmVkID0gdHJ1ZTtcbiAgICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgaWYgKGVsZW0udGlkID09PSBlbC50aWQgfHwgZWxlbS50aWQgPT0gZWwuYXRpZCB8fCBlbGVtLnJlZiA9PT0gZWwucmVmKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9KVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAocmVtb3ZhbCkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBmaW5kRWxlbWVudChyZW1vdmFsLCBtb3VudCk7XG4gICAgICAgIGlmICh0YXJnZXQpIHtcbiAgICAgICAgICAgIHRhcmdldC5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldE5vZGUgPSBmaW5kRWxlbWVudChjaGFuZ2UsIG1vdW50KTtcbiAgICAgICAgaWYgKGV4dHMuT2JqZWN0cy5pc051bGxPclVuZGVmaW5lZCh0YXJnZXROb2RlKSkge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0Tm9kZVBhcmVudCA9IGZpbmRFbGVtZW50UGFyZW50YnlSZWYoY2hhbmdlLnJlZiwgbW91bnQpO1xuICAgICAgICAgICAgaWYgKGV4dHMuT2JqZWN0cy5pc051bGxPclVuZGVmaW5lZCh0YXJnZXROb2RlUGFyZW50KSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmFibGUgdG8gYXBwbHkgbmV3IGNoYW5nZSBzdHJlYW06ICcsIGNoYW5nZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdE5vZGUgPSBtYWtlci5NYWtlKGRvY3VtZW50LCBjaGFuZ2UsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHRhcmdldE5vZGVQYXJlbnQuYXBwZW5kQ2hpbGQodE5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIEFwcGx5U3RyZWFtTm9kZShjaGFuZ2UsIHRhcmdldE5vZGUsIGRpY3RhdG9yLCBtYWtlcik7XG4gICAgfSk7XG4gICAgcmV0dXJuO1xufVxuZXhwb3J0cy5TdHJlYW1KU09OTm9kZXMgPSBTdHJlYW1KU09OTm9kZXM7XG5mdW5jdGlvbiBBcHBseVN0cmVhbU5vZGUoZnJhZ21lbnQsIHRhcmdldE5vZGUsIGRpY3RhdG9yLCBtYWtlcikge1xuICAgIGlmICghZGljdGF0b3IuU2FtZSh0YXJnZXROb2RlLCBmcmFnbWVudCkpIHtcbiAgICAgICAgY29uc3QgdE5vZGUgPSBtYWtlci5NYWtlKGRvY3VtZW50LCBmcmFnbWVudCwgZmFsc2UsIHRydWUpO1xuICAgICAgICBkb20ucmVwbGFjZU5vZGUodGFyZ2V0Tm9kZS5wYXJlbnROb2RlLCB0YXJnZXROb2RlLCB0Tm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRpY3RhdG9yLkNoYW5nZWQodGFyZ2V0Tm9kZSwgZnJhZ21lbnQpKSB7XG4gICAgICAgIFBhdGNoSlNPTkF0dHJpYnV0ZXMoZnJhZ21lbnQsIHRhcmdldE5vZGUpO1xuICAgIH1cbiAgICBjb25zdCB0b3RhbEtpZHMgPSB0YXJnZXROb2RlLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgIGNvbnN0IGZyYWdtZW50S2lkcyA9IGZyYWdtZW50LmNoaWxkcmVuLmxlbmd0aDtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yICg7IGkgPCB0b3RhbEtpZHM7IGkrKykge1xuICAgICAgICBjb25zdCBjaGlsZE5vZGUgPSB0YXJnZXROb2RlLmNoaWxkTm9kZXNbaV07XG4gICAgICAgIGlmIChpID49IGZyYWdtZW50S2lkcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNoaWxkRnJhZ21lbnQgPSBmcmFnbWVudC5jaGlsZHJlbltpXTtcbiAgICAgICAgUGF0Y2hKU09OTm9kZShjaGlsZEZyYWdtZW50LCBjaGlsZE5vZGUsIGRpY3RhdG9yLCBtYWtlcik7XG4gICAgfVxuICAgIGZvciAoOyBpIDwgZnJhZ21lbnRLaWRzOyBpKyspIHtcbiAgICAgICAgY29uc3QgdE5vZGUgPSBtYWtlci5NYWtlKGRvY3VtZW50LCBmcmFnbWVudCwgZmFsc2UsIHRydWUpO1xuICAgICAgICB0YXJnZXROb2RlLmFwcGVuZENoaWxkKHROb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xufVxuZXhwb3J0cy5BcHBseVN0cmVhbU5vZGUgPSBBcHBseVN0cmVhbU5vZGU7XG5mdW5jdGlvbiBQYXRjaFRleHRDb21tZW50V2l0aEpTT04oZnJhZ21lbnQsIHRhcmdldCkge1xuICAgIGlmIChmcmFnbWVudC50eXBlICE9PSBkb21fMS5DT01NRU5UX05PREUgJiYgZnJhZ21lbnQudHlwZSAhPT0gZG9tXzEuVEVYVF9OT0RFKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGZyYWdtZW50LnR5cGUgIT09IGRvbV8xLkNPTU1FTlRfTk9ERSAmJiBmcmFnbWVudC50eXBlICE9PSBkb21fMS5URVhUX05PREUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGFyZ2V0LnRleHRDb250ZW50ID09PSBmcmFnbWVudC5jb250ZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGFyZ2V0LnRleHRDb250ZW50ID0gZnJhZ21lbnQuY29udGVudDtcbiAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKHRhcmdldCwgJ19yZWYnLCBmcmFnbWVudC5yZWYpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgodGFyZ2V0LCAnX3RpZCcsIGZyYWdtZW50LnRpZCk7XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aCh0YXJnZXQsICdfYXRpZCcsIGZyYWdtZW50LmF0aWQpO1xufVxuZXhwb3J0cy5QYXRjaFRleHRDb21tZW50V2l0aEpTT04gPSBQYXRjaFRleHRDb21tZW50V2l0aEpTT047XG5mdW5jdGlvbiBQYXRjaEpTT05BdHRyaWJ1dGVzKG5vZGUsIHRhcmdldCkge1xuICAgIGNvbnN0IG9sZE5vZGVBdHRycyA9IGRvbS5yZWNvcmRBdHRyaWJ1dGVzKHRhcmdldCk7XG4gICAgbm9kZS5hdHRycy5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2xkTm9kZUF0dHJzW2F0dHIuS2V5XTtcbiAgICAgICAgZGVsZXRlIG9sZE5vZGVBdHRyc1thdHRyLktleV07XG4gICAgICAgIGlmIChhdHRyLlZhbHVlID09PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0LnNldEF0dHJpYnV0ZShhdHRyLktleSwgYXR0ci5WYWx1ZSk7XG4gICAgfSk7XG4gICAgZm9yIChsZXQgaW5kZXggaW4gb2xkTm9kZUF0dHJzKSB7XG4gICAgICAgIHRhcmdldC5yZW1vdmVBdHRyaWJ1dGUoaW5kZXgpO1xuICAgIH1cbiAgICB0YXJnZXQuc2V0QXR0cmlidXRlKCdfdGlkJywgbm9kZS50aWQpO1xuICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoJ19yZWYnLCBub2RlLnJlZik7XG4gICAgdGFyZ2V0LnNldEF0dHJpYnV0ZSgnX2F0aWQnLCBub2RlLmF0aWQpO1xuICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoJ2V2ZW50cycsIEJ1aWxkRXZlbnQobm9kZS5ldmVudHMpKTtcbiAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKHRhcmdldCwgJ19pZCcsIG5vZGUuaWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgodGFyZ2V0LCAnX3JlZicsIG5vZGUucmVmKTtcbiAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKHRhcmdldCwgJ190aWQnLCBub2RlLnRpZCk7XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aCh0YXJnZXQsICdfYXRpZCcsIG5vZGUuYXRpZCk7XG59XG5leHBvcnRzLlBhdGNoSlNPTkF0dHJpYnV0ZXMgPSBQYXRjaEpTT05BdHRyaWJ1dGVzO1xuZnVuY3Rpb24gUGF0Y2hET01UcmVlKG5ld0ZyYWdtZW50LCBvbGROb2RlT3JNb3VudCwgZGljdGF0b3IsIGlzQ2hpbGRSZWN1cnNpb24pIHtcbiAgICBpZiAoaXNDaGlsZFJlY3Vyc2lvbikge1xuICAgICAgICBjb25zdCByb290Tm9kZSA9IG9sZE5vZGVPck1vdW50LnBhcmVudE5vZGU7XG4gICAgICAgIGlmICghZGljdGF0b3IuU2FtZShvbGROb2RlT3JNb3VudCwgbmV3RnJhZ21lbnQpKSB7XG4gICAgICAgICAgICBkb20ucmVwbGFjZU5vZGUocm9vdE5vZGUsIG9sZE5vZGVPck1vdW50LCBuZXdGcmFnbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9sZE5vZGVPck1vdW50Lmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgICAgICAgZG9tLnJlcGxhY2VOb2RlKHJvb3ROb2RlLCBvbGROb2RlT3JNb3VudCwgbmV3RnJhZ21lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgb2xkQ2hpbGRyZW4gPSBvbGROb2RlT3JNb3VudC5jaGlsZE5vZGVzO1xuICAgIGNvbnN0IG9sZENoaWxkcmVuTGVuZ3RoID0gb2xkQ2hpbGRyZW4ubGVuZ3RoO1xuICAgIGNvbnN0IG5ld0NoaWxkcmVuID0gbmV3RnJhZ21lbnQuY2hpbGROb2RlcztcbiAgICBjb25zdCBuZXdDaGlsZHJlbkxlbmd0aCA9IG5ld0NoaWxkcmVuLmxlbmd0aDtcbiAgICBjb25zdCByZW1vdmVPbGRMZWZ0ID0gbmV3Q2hpbGRyZW5MZW5ndGggPCBvbGRDaGlsZHJlbkxlbmd0aDtcbiAgICBsZXQgbGFzdEluZGV4ID0gMDtcbiAgICBsZXQgbGFzdE5vZGU7XG4gICAgbGV0IGxhc3ROb2RlTmV4dFNpYmxpbmc7XG4gICAgbGV0IG5ld05vZGVIYW5kbGVkO1xuICAgIGZvciAoOyBsYXN0SW5kZXggPCBvbGRDaGlsZHJlbkxlbmd0aDsgbGFzdEluZGV4KyspIHtcbiAgICAgICAgaWYgKGxhc3RJbmRleCA+PSBuZXdDaGlsZHJlbkxlbmd0aCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdE5vZGUgPSBvbGRDaGlsZHJlbltsYXN0SW5kZXhdO1xuICAgICAgICBuZXdOb2RlSGFuZGxlZCA9IG5ld0NoaWxkcmVuW2xhc3RJbmRleF07XG4gICAgICAgIGxhc3ROb2RlTmV4dFNpYmxpbmcgPSBsYXN0Tm9kZS5uZXh0U2libGluZztcbiAgICAgICAgaWYgKCFkaWN0YXRvci5TYW1lKGxhc3ROb2RlLCBuZXdOb2RlSGFuZGxlZCkpIHtcbiAgICAgICAgICAgIGRvbS5yZXBsYWNlTm9kZShvbGROb2RlT3JNb3VudCwgbGFzdE5vZGUsIG5ld05vZGVIYW5kbGVkKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGljdGF0b3IuQ2hhbmdlZChsYXN0Tm9kZSwgbmV3Tm9kZUhhbmRsZWQpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGFzdE5vZGUubm9kZVR5cGUgPT09IGRvbS5URVhUX05PREUgfHwgbGFzdE5vZGUubm9kZVR5cGUgPT09IGRvbS5DT01NRU5UX05PREUpIHtcbiAgICAgICAgICAgIGlmIChsYXN0Tm9kZS50ZXh0Q29udGVudCAhPT0gbmV3Tm9kZUhhbmRsZWQudGV4dENvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBsYXN0Tm9kZS50ZXh0Q29udGVudCA9IG5ld05vZGVIYW5kbGVkLnRleHRDb250ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFsYXN0Tm9kZS5oYXNDaGlsZE5vZGVzKCkgJiYgbmV3Tm9kZUhhbmRsZWQuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICBkb20ucmVwbGFjZU5vZGUob2xkTm9kZU9yTW91bnQsIGxhc3ROb2RlLCBuZXdOb2RlSGFuZGxlZCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGFzdE5vZGUuaGFzQ2hpbGROb2RlcygpICYmICFuZXdOb2RlSGFuZGxlZC5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICAgICAgICAgIGRvbS5yZXBsYWNlTm9kZShvbGROb2RlT3JNb3VudCwgbGFzdE5vZGUsIG5ld05vZGVIYW5kbGVkKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxhc3RFbGVtZW50ID0gbGFzdE5vZGU7XG4gICAgICAgIGNvbnN0IG5ld0VsZW1lbnQgPSBuZXdOb2RlSGFuZGxlZDtcbiAgICAgICAgUGF0Y2hET01BdHRyaWJ1dGVzKG5ld0VsZW1lbnQsIGxhc3RFbGVtZW50KTtcbiAgICAgICAgbGFzdEVsZW1lbnQuc2V0QXR0cmlidXRlKCdfcGF0Y2hlZCcsICd0cnVlJyk7XG4gICAgICAgIFBhdGNoRE9NVHJlZShuZXdFbGVtZW50LCBsYXN0RWxlbWVudCwgZGljdGF0b3IsIHRydWUpO1xuICAgICAgICBsYXN0RWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ19wYXRjaGVkJyk7XG4gICAgfVxuICAgIGlmIChyZW1vdmVPbGRMZWZ0ICYmIGxhc3ROb2RlTmV4dFNpYmxpbmcgIT09IG51bGwpIHtcbiAgICAgICAgZG9tLnJlbW92ZUZyb21Ob2RlKGxhc3ROb2RlTmV4dFNpYmxpbmcsIG51bGwpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZm9yICg7IGxhc3RJbmRleCA8IG5ld0NoaWxkcmVuTGVuZ3RoOyBsYXN0SW5kZXgrKykge1xuICAgICAgICBjb25zdCBuZXdOb2RlID0gbmV3Q2hpbGRyZW5bbGFzdEluZGV4XTtcbiAgICAgICAgb2xkTm9kZU9yTW91bnQuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgfVxufVxuZXhwb3J0cy5QYXRjaERPTVRyZWUgPSBQYXRjaERPTVRyZWU7XG5mdW5jdGlvbiBQYXRjaERPTUF0dHJpYnV0ZXMobmV3RWxlbWVudCwgb2xkRWxlbWVudCkge1xuICAgIGNvbnN0IG9sZE5vZGVBdHRycyA9IGRvbS5yZWNvcmRBdHRyaWJ1dGVzKG9sZEVsZW1lbnQpO1xuICAgIGZvciAobGV0IGluZGV4IGluIG5ld0VsZW1lbnQuYXR0cmlidXRlcykge1xuICAgICAgICBjb25zdCBhdHRyID0gbmV3RWxlbWVudC5hdHRyaWJ1dGVzW2luZGV4XTtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvbGROb2RlQXR0cnNbYXR0ci5uYW1lXTtcbiAgICAgICAgZGVsZXRlIG9sZE5vZGVBdHRyc1thdHRyLm5hbWVdO1xuICAgICAgICBpZiAoYXR0ci52YWx1ZSA9PT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIG9sZEVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgfVxuICAgIGZvciAobGV0IGluZGV4IGluIG9sZE5vZGVBdHRycykge1xuICAgICAgICBvbGRFbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShpbmRleCk7XG4gICAgfVxufVxuZXhwb3J0cy5QYXRjaERPTUF0dHJpYnV0ZXMgPSBQYXRjaERPTUF0dHJpYnV0ZXM7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXRjaC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IHByb21pc2UgPSByZXF1aXJlKFwicHJvbWlzZS1wb2x5ZmlsbFwiKTtcbmV4cG9ydHMuUHJvbWlzZUFQSSA9IHtcbiAgICBQcm9taXNlOiBzZWxmLlByb21pc2UsXG59O1xuaWYgKCFzZWxmLlByb21pc2UpIHtcbiAgICBleHBvcnRzLlByb21pc2VBUEkuUHJvbWlzZSA9IHByb21pc2U7XG4gICAgc2VsZi5Qcm9taXNlID0gcHJvbWlzZTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByb21pc2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBub3cgPSAoZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAocGVyZm9ybWFuY2Uubm93IHx8XG4gICAgICAgIHBlcmZvcm1hbmNlLm1vek5vdyB8fFxuICAgICAgICBwZXJmb3JtYW5jZS5tc05vdyB8fFxuICAgICAgICBwZXJmb3JtYW5jZS5vTm93IHx8XG4gICAgICAgIHBlcmZvcm1hbmNlLndlYmtpdE5vdyB8fFxuICAgICAgICBEYXRlLm5vdyk7XG59KSgpO1xuY29uc3QgZnJhbWVSYXRlID0gMTAwMCAvIDYwO1xuY29uc3QgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XG5mdW5jdGlvbiBHZXRSQUYoKSB7XG4gICAgbGV0IGxhc3RUaW1lID0gMDtcbiAgICBjb25zdCBtb2QgPSB7fTtcbiAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcbiAgICAgICAgbW9kLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgICBtb2QuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPVxuICAgICAgICAgICAgd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCB3aW5kb3dbdmVuZG9yc1t4XSArICdSZXF1ZXN0Q2FuY2VsQW5pbWF0aW9uRnJhbWUnXTtcbiAgICB9XG4gICAgaWYgKCFtb2QucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICFtb2QuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgIG1vZC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJUaW1lID0gbm93KCk7XG4gICAgICAgICAgICBjb25zdCB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgZnJhbWVSYXRlIC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJywgZSk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGltZVRvQ2FsbCk7XG4gICAgICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfTtcbiAgICBpZiAoIW1vZC5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgICAgICBtb2QuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBtb2Q7XG59XG5leHBvcnRzLkdldFJBRiA9IEdldFJBRjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXJhZi1wb2x5ZmlsbC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmZ1bmN0aW9uIGxpbmVhcih0KSB7XG4gICAgcmV0dXJuIHQ7XG59XG5leHBvcnRzLmxpbmVhciA9IGxpbmVhcjtcbmZ1bmN0aW9uIGVhc2VJblF1YWQodCkge1xuICAgIHJldHVybiB0ICogdDtcbn1cbmV4cG9ydHMuZWFzZUluUXVhZCA9IGVhc2VJblF1YWQ7XG5mdW5jdGlvbiBlYXNlT3V0UXVhZCh0KSB7XG4gICAgcmV0dXJuIHQgKiAoMiAtIHQpO1xufVxuZXhwb3J0cy5lYXNlT3V0UXVhZCA9IGVhc2VPdXRRdWFkO1xuZnVuY3Rpb24gZWFzZUluT3V0UXVhZCh0KSB7XG4gICAgcmV0dXJuIHQgPCAwLjUgPyAyICogdCAqIHQgOiAtMSArICg0IC0gMiAqIHQpICogdDtcbn1cbmV4cG9ydHMuZWFzZUluT3V0UXVhZCA9IGVhc2VJbk91dFF1YWQ7XG5mdW5jdGlvbiBlYXNlSW5DdWJpYyh0KSB7XG4gICAgcmV0dXJuIHQgKiB0ICogdDtcbn1cbmV4cG9ydHMuZWFzZUluQ3ViaWMgPSBlYXNlSW5DdWJpYztcbmZ1bmN0aW9uIGVhc2VPdXRDdWJpYyh0KSB7XG4gICAgcmV0dXJuIC0tdCAqIHQgKiB0ICsgMTtcbn1cbmV4cG9ydHMuZWFzZU91dEN1YmljID0gZWFzZU91dEN1YmljO1xuZnVuY3Rpb24gZWFzZUluT3V0Q3ViaWModCkge1xuICAgIHJldHVybiB0IDwgMC41ID8gNCAqIHQgKiB0ICogdCA6ICh0IC0gMSkgKiAoMiAqIHQgLSAyKSAqICgyICogdCAtIDIpICsgMTtcbn1cbmV4cG9ydHMuZWFzZUluT3V0Q3ViaWMgPSBlYXNlSW5PdXRDdWJpYztcbmZ1bmN0aW9uIGVhc2VJblF1YXJ0KHQpIHtcbiAgICByZXR1cm4gdCAqIHQgKiB0ICogdDtcbn1cbmV4cG9ydHMuZWFzZUluUXVhcnQgPSBlYXNlSW5RdWFydDtcbmZ1bmN0aW9uIGVhc2VPdXRRdWFydCh0KSB7XG4gICAgcmV0dXJuIDEgLSAtLXQgKiB0ICogdCAqIHQ7XG59XG5leHBvcnRzLmVhc2VPdXRRdWFydCA9IGVhc2VPdXRRdWFydDtcbmZ1bmN0aW9uIGVhc2VJbk91dFF1YXJ0KHQpIHtcbiAgICByZXR1cm4gdCA8IDAuNSA/IDggKiB0ICogdCAqIHQgKiB0IDogMSAtIDggKiAtLXQgKiB0ICogdCAqIHQ7XG59XG5leHBvcnRzLmVhc2VJbk91dFF1YXJ0ID0gZWFzZUluT3V0UXVhcnQ7XG5mdW5jdGlvbiBlYXNlSW5RdWludCh0KSB7XG4gICAgcmV0dXJuIHQgKiB0ICogdCAqIHQgKiB0O1xufVxuZXhwb3J0cy5lYXNlSW5RdWludCA9IGVhc2VJblF1aW50O1xuZnVuY3Rpb24gZWFzZU91dFF1aW50KHQpIHtcbiAgICByZXR1cm4gMSArIC0tdCAqIHQgKiB0ICogdCAqIHQ7XG59XG5leHBvcnRzLmVhc2VPdXRRdWludCA9IGVhc2VPdXRRdWludDtcbmZ1bmN0aW9uIGVhc2VJbk91dFF1aW50KHQpIHtcbiAgICByZXR1cm4gdCA8IDAuNSA/IDE2ICogdCAqIHQgKiB0ICogdCAqIHQgOiAxICsgMTYgKiAtLXQgKiB0ICogdCAqIHQgKiB0O1xufVxuZXhwb3J0cy5lYXNlSW5PdXRRdWludCA9IGVhc2VJbk91dFF1aW50O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHdlZW4uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5mdW5jdGlvbiBCbGFuaygpIHsgfVxuZXhwb3J0cy5CbGFuayA9IEJsYW5rO1xuQmxhbmsucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbmZ1bmN0aW9uIGhhcyhtYXAsIHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwobWFwLCBwcm9wZXJ0eSk7XG59XG5leHBvcnRzLmhhcyA9IGhhcztcbmZ1bmN0aW9uIGNyZWF0ZU1hcCgpIHtcbiAgICByZXR1cm4gbmV3IEJsYW5rKCk7XG59XG5leHBvcnRzLmNyZWF0ZU1hcCA9IGNyZWF0ZU1hcDtcbmZ1bmN0aW9uIHRydW5jYXRlQXJyYXkoYXJyLCBsZW5ndGgpIHtcbiAgICB3aGlsZSAoYXJyLmxlbmd0aCA+IGxlbmd0aCkge1xuICAgICAgICBhcnIucG9wKCk7XG4gICAgfVxufVxuZXhwb3J0cy50cnVuY2F0ZUFycmF5ID0gdHJ1bmNhdGVBcnJheTtcbmZ1bmN0aW9uIGRlY29kZUZvcm1Cb2R5KGJvZHkpIHtcbiAgICBsZXQgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIGJvZHlcbiAgICAgICAgLnRyaW0oKVxuICAgICAgICAuc3BsaXQoJyYnKVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoYnl0ZXMpIHtcbiAgICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgICAgICBsZXQgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpO1xuICAgICAgICAgICAgbGV0IG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpO1xuICAgICAgICAgICAgbGV0IHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpO1xuICAgICAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmb3JtO1xufVxuZXhwb3J0cy5kZWNvZGVGb3JtQm9keSA9IGRlY29kZUZvcm1Cb2R5O1xuZnVuY3Rpb24gcGFyc2VIVFRQSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgbGV0IGhlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xuICAgIGxldCBwcmVQcm9jZXNzZWRIZWFkZXJzID0gcmF3SGVhZGVycy5yZXBsYWNlKC9cXHI/XFxuW1xcdCBdKy9nLCAnICcpO1xuICAgIHByZVByb2Nlc3NlZEhlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIGxldCBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKTtcbiAgICAgICAgbGV0IGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpO1xuICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpO1xuICAgICAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaGVhZGVycztcbn1cbmV4cG9ydHMucGFyc2VIVFRQSGVhZGVycyA9IHBhcnNlSFRUUEhlYWRlcnM7XG5mdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcik7XG4gICAgICAgIH07XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbGVSZWFkZXJSZWFkeSA9IGZpbGVSZWFkZXJSZWFkeTtcbmZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgbGV0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgbGV0IHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKTtcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYik7XG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5leHBvcnRzLnJlYWRCbG9iQXNBcnJheUJ1ZmZlciA9IHJlYWRCbG9iQXNBcnJheUJ1ZmZlcjtcbmZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICBsZXQgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICBsZXQgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpO1xuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpO1xuICAgIHJldHVybiBwcm9taXNlO1xufVxuZXhwb3J0cy5yZWFkQmxvYkFzVGV4dCA9IHJlYWRCbG9iQXNUZXh0O1xuZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIGxldCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKTtcbiAgICBsZXQgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKTtcbn1cbmV4cG9ydHMucmVhZEFycmF5QnVmZmVyQXNUZXh0ID0gcmVhZEFycmF5QnVmZmVyQXNUZXh0O1xuZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgICByZXR1cm4gYnVmLnNsaWNlKDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbGV0IHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aCk7XG4gICAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpO1xuICAgICAgICByZXR1cm4gdmlldy5idWZmZXI7XG4gICAgfVxufVxuZXhwb3J0cy5idWZmZXJDbG9uZSA9IGJ1ZmZlckNsb25lO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLk9uZVNlY29uZCA9IDEwMDA7XG5leHBvcnRzLk9uZU1pbnV0ZSA9IGV4cG9ydHMuT25lU2Vjb25kICogNjA7XG5jbGFzcyBTb2NrZXQge1xuICAgIGNvbnN0cnVjdG9yKGFkZHIsIHJlYWRlciwgZXhwb25lbnQsIG1heFJlY29ubmVjdHMsIG1heFdhaXQpIHtcbiAgICAgICAgdGhpcy5hZGRyID0gYWRkcjtcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBudWxsO1xuICAgICAgICB0aGlzLnJlYWRlciA9IHJlYWRlcjtcbiAgICAgICAgdGhpcy5tYXhXYWl0ID0gbWF4V2FpdDtcbiAgICAgICAgdGhpcy51c2VyQ2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZXhwb25lbnQgPSBleHBvbmVudDtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5hdHRlbXB0ZWRDb25uZWN0cyA9IDA7XG4gICAgICAgIHRoaXMubGFzdFdhaXQgPSBleHBvcnRzLk9uZVNlY29uZDtcbiAgICAgICAgdGhpcy5tYXhSZWNvbm5lY3QgPSBtYXhSZWNvbm5lY3RzO1xuICAgICAgICB0aGlzLndyaXRlQnVmZmVyID0gbmV3IEFycmF5KCk7XG4gICAgfVxuICAgIGNvbm5lY3QoKSB7XG4gICAgICAgIGlmICh0aGlzLnNvY2tldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmF0dGVtcHRlZENvbm5lY3RzID49IHRoaXMubWF4UmVjb25uZWN0KSB7XG4gICAgICAgICAgICB0aGlzLnJlYWRlci5FeGhhdXN0ZWQodGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IFdlYlNvY2tldCh0aGlzLmFkZHIpO1xuICAgICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsIHRoaXMuX29wZW5lZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5fZXJyb3JlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLl9tZXNzYWdlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5fZGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgc2VuZChtZXNzYWdlKSB7XG4gICAgICAgIGlmICh0aGlzLmRpc2Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgdGhpcy53cml0ZUJ1ZmZlci5wdXNoKG1lc3NhZ2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc29ja2V0LnNlbmQobWVzc2FnZSk7XG4gICAgfVxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLmF0dGVtcHRlZENvbm5lY3RzID0gMDtcbiAgICAgICAgdGhpcy5sYXN0V2FpdCA9IGV4cG9ydHMuT25lU2Vjb25kO1xuICAgIH1cbiAgICBlbmQoKSB7XG4gICAgICAgIHRoaXMudXNlckNsb3NlZCA9IHRydWU7XG4gICAgICAgIHRoaXMucmVhZGVyLkNsb3NlZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBudWxsO1xuICAgIH1cbiAgICBfZGlzY29ubmVjdGVkKGV2ZW50KSB7XG4gICAgICAgIHRoaXMucmVhZGVyLkRpc2Nvbm5lY3RlZChldmVudCwgdGhpcyk7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy51c2VyQ2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG5leHRXYWl0ID0gdGhpcy5sYXN0V2FpdDtcbiAgICAgICAgaWYgKHRoaXMuZXhwb25lbnQpIHtcbiAgICAgICAgICAgIG5leHRXYWl0ID0gdGhpcy5leHBvbmVudChuZXh0V2FpdCk7XG4gICAgICAgICAgICBpZiAobmV4dFdhaXQgPiB0aGlzLm1heFdhaXQpIHtcbiAgICAgICAgICAgICAgICBuZXh0V2FpdCA9IHRoaXMubWF4V2FpdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KHRoaXMuY29ubmVjdC5iaW5kKHRoaXMpLCBuZXh0V2FpdCk7XG4gICAgICAgIHRoaXMuYXR0ZW1wdGVkQ29ubmVjdHMrKztcbiAgICB9XG4gICAgX29wZW5lZChldmVudCkge1xuICAgICAgICB0aGlzLnJlYWRlci5Db25uZWN0ZWQoZXZlbnQsIHRoaXMpO1xuICAgICAgICB3aGlsZSAodGhpcy53cml0ZUJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy53cml0ZUJ1ZmZlci5zaGlmdCgpO1xuICAgICAgICAgICAgdGhpcy5zb2NrZXQuc2VuZChtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZXJyb3JlZChldmVudCkge1xuICAgICAgICB0aGlzLnJlYWRlci5FcnJvcmVkKGV2ZW50LCB0aGlzKTtcbiAgICB9XG4gICAgX21lc3NhZ2VkKGV2ZW50KSB7XG4gICAgICAgIHRoaXMucmVhZGVyLk1lc3NhZ2UoZXZlbnQsIHRoaXMpO1xuICAgIH1cbn1cbmV4cG9ydHMuU29ja2V0ID0gU29ja2V0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9d2Vic29ja2V0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgcmFmID0gcmVxdWlyZShcIi4vcmFmLXBvbHlmaWxsXCIpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbmNvbnN0IGV4dHMgPSByZXF1aXJlKFwiLi9leHRlbnNpb25zXCIpO1xuY29uc3QgYW5pbWUgPSByZXF1aXJlKFwiLi9hbmltZVwiKTtcbmNvbnN0IHBhdGNoID0gcmVxdWlyZShcIi4vcGF0Y2hcIik7XG5jb25zdCBtb3VudCA9IHJlcXVpcmUoXCIuL21vdW50XCIpO1xuY29uc3QgZG9tID0gcmVxdWlyZShcIi4vZG9tXCIpO1xuY29uc3Qgd3MgPSByZXF1aXJlKFwiLi93ZWJzb2NrZXRcIik7XG5jb25zdCBodHRwID0gcmVxdWlyZShcIi4vaHR0cFwiKTtcbmNvbnN0IHR3ZWVuZWQgPSByZXF1aXJlKFwiLi90d2VlblwiKTtcbmNvbnN0IGludGVyID0gcmVxdWlyZShcIi4vaW50ZXJwb2xhdGlvbnNcIik7XG5jb25zdCBmZXRjaF8xID0gcmVxdWlyZShcIi4vZmV0Y2hcIik7XG5jb25zdCBwcm9taXNlXzEgPSByZXF1aXJlKFwiLi9wcm9taXNlXCIpO1xuZXhwb3J0cy5XZWJWTSA9IHtcbiAgICBkb206IGRvbSxcbiAgICByYWY6IHJhZixcbiAgICBodHRwOiBodHRwLFxuICAgIG1vdW50OiBtb3VudCxcbiAgICBwYXRjaDogcGF0Y2gsXG4gICAgdXRpbHM6IHV0aWxzLFxuICAgIHdlYnNvY2tldDogd3MsXG4gICAgZmV0Y2g6IGZldGNoXzEuZmV0Y2hBUEksXG4gICAgZXh0ZW5zaW9uczogZXh0cyxcbiAgICBwcm9taXNlOiBwcm9taXNlXzEuUHJvbWlzZUFQSS5Qcm9taXNlLFxuICAgIHZmeDoge1xuICAgICAgICB0d2VlbjogdHdlZW5lZCxcbiAgICAgICAgYW5pbWF0aW9uczogYW5pbWUsXG4gICAgICAgIGludGVycG9sYXRpb25zOiBpbnRlcixcbiAgICB9LFxufTtcbnNlbGYuV2ViVk0gPSBleHBvcnRzLldlYlZNO1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0cy5XZWJWTTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXdlYnZtLmpzLm1hcCJdfQ==
