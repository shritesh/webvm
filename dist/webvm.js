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
class DOMMount {
    constructor(document, target) {
        this.doc = document;
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
    update(changes) { }
    stream(changes) { }
}
exports.DOMMount = DOMMount;

},{}],12:[function(require,module,exports){
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
function JSONPatchTree(fragment, mount, dictator, maker) {
    let targetNode = findElement(fragment, mount);
    if (exts.Objects.isNullOrUndefined(targetNode)) {
        const tNode = maker.Make(document, fragment, false, true);
        mount.appendChild(targetNode);
        return;
    }
    PatchJSONNode(fragment, targetNode, dictator, maker);
}
exports.JSONPatchTree = JSONPatchTree;
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
function JSONChangesPatch(fragment, mount, dictator, maker) {
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
        ApplyJSONNode(change, targetNode, dictator, maker);
    });
    return;
}
exports.JSONChangesPatch = JSONChangesPatch;
function ApplyJSONNode(fragment, targetNode, dictator, maker) {
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
exports.ApplyJSONNode = ApplyJSONNode;
function JSONPatchTextComments(fragment, target) {
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
exports.JSONPatchTextComments = JSONPatchTextComments;
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
function PatchTree(newFragment, oldNodeOrMount, dictator, isChildRecursion) {
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
        PatchAttributes(newElement, lastElement);
        lastElement.setAttribute('_patched', 'true');
        PatchTree(newElement, lastElement, dictator, true);
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
exports.PatchTree = PatchTree;
function PatchAttributes(newElement, oldElement) {
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
exports.PatchAttributes = PatchAttributes;

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdGltZXJzLWJyb3dzZXJpZnkvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcHJvbWlzZS1wb2x5ZmlsbC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2Rpc3QvZmV0Y2gudW1kLmpzIiwic3JjL2FuaW1lLmpzIiwic3JjL2RvbS5qcyIsInNyYy9leHRlbnNpb25zLmpzIiwic3JjL2ZldGNoLmpzIiwic3JjL2h0dHAuanMiLCJzcmMvaW50ZXJwb2xhdGlvbnMuanMiLCJzcmMvbW91bnQuanMiLCJzcmMvcGF0Y2guanMiLCJzcmMvcHJvbWlzZS5qcyIsInNyYy9yYWYtcG9seWZpbGwuanMiLCJzcmMvdHdlZW4uanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd2Vic29ja2V0LmpzIiwic3JjL3dlYnZtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDblFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25oQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsInZhciBuZXh0VGljayA9IHJlcXVpcmUoJ3Byb2Nlc3MvYnJvd3Nlci5qcycpLm5leHRUaWNrO1xudmFyIGFwcGx5ID0gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5O1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGltbWVkaWF0ZUlkcyA9IHt9O1xudmFyIG5leHRJbW1lZGlhdGVJZCA9IDA7XG5cbi8vIERPTSBBUElzLCBmb3IgY29tcGxldGVuZXNzXG5cbmV4cG9ydHMuc2V0VGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFyVGltZW91dCk7XG59O1xuZXhwb3J0cy5zZXRJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhckludGVydmFsKTtcbn07XG5leHBvcnRzLmNsZWFyVGltZW91dCA9XG5leHBvcnRzLmNsZWFySW50ZXJ2YWwgPSBmdW5jdGlvbih0aW1lb3V0KSB7IHRpbWVvdXQuY2xvc2UoKTsgfTtcblxuZnVuY3Rpb24gVGltZW91dChpZCwgY2xlYXJGbikge1xuICB0aGlzLl9pZCA9IGlkO1xuICB0aGlzLl9jbGVhckZuID0gY2xlYXJGbjtcbn1cblRpbWVvdXQucHJvdG90eXBlLnVucmVmID0gVGltZW91dC5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7fTtcblRpbWVvdXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csIHRoaXMuX2lkKTtcbn07XG5cbi8vIERvZXMgbm90IHN0YXJ0IHRoZSB0aW1lLCBqdXN0IHNldHMgdXAgdGhlIG1lbWJlcnMgbmVlZGVkLlxuZXhwb3J0cy5lbnJvbGwgPSBmdW5jdGlvbihpdGVtLCBtc2Vjcykge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gbXNlY3M7XG59O1xuXG5leHBvcnRzLnVuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gLTE7XG59O1xuXG5leHBvcnRzLl91bnJlZkFjdGl2ZSA9IGV4cG9ydHMuYWN0aXZlID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG5cbiAgdmFyIG1zZWNzID0gaXRlbS5faWRsZVRpbWVvdXQ7XG4gIGlmIChtc2VjcyA+PSAwKSB7XG4gICAgaXRlbS5faWRsZVRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCkge1xuICAgICAgaWYgKGl0ZW0uX29uVGltZW91dClcbiAgICAgICAgaXRlbS5fb25UaW1lb3V0KCk7XG4gICAgfSwgbXNlY3MpO1xuICB9XG59O1xuXG4vLyBUaGF0J3Mgbm90IGhvdyBub2RlLmpzIGltcGxlbWVudHMgaXQgYnV0IHRoZSBleHBvc2VkIGFwaSBpcyB0aGUgc2FtZS5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0SW1tZWRpYXRlIDogZnVuY3Rpb24oZm4pIHtcbiAgdmFyIGlkID0gbmV4dEltbWVkaWF0ZUlkKys7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA8IDIgPyBmYWxzZSA6IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICBpbW1lZGlhdGVJZHNbaWRdID0gdHJ1ZTtcblxuICBuZXh0VGljayhmdW5jdGlvbiBvbk5leHRUaWNrKCkge1xuICAgIGlmIChpbW1lZGlhdGVJZHNbaWRdKSB7XG4gICAgICAvLyBmbi5jYWxsKCkgaXMgZmFzdGVyIHNvIHdlIG9wdGltaXplIGZvciB0aGUgY29tbW9uIHVzZS1jYXNlXG4gICAgICAvLyBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2NhbGwtYXBwbHktc2VndVxuICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgICAgLy8gUHJldmVudCBpZHMgZnJvbSBsZWFraW5nXG4gICAgICBleHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpZDtcbn07XG5cbmV4cG9ydHMuY2xlYXJJbW1lZGlhdGUgPSB0eXBlb2YgY2xlYXJJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IGNsZWFySW1tZWRpYXRlIDogZnVuY3Rpb24oaWQpIHtcbiAgZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF07XG59OyIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHRoaXMge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGZpbmFsbHlDb25zdHJ1Y3RvcihjYWxsYmFjaykge1xuICB2YXIgY29uc3RydWN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICByZXR1cm4gdGhpcy50aGVuKFxuICAgIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yLnJlc29sdmUoY2FsbGJhY2soKSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yLnJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG4gICAgfVxuICApO1xufVxuXG4vLyBTdG9yZSBzZXRUaW1lb3V0IHJlZmVyZW5jZSBzbyBwcm9taXNlLXBvbHlmaWxsIHdpbGwgYmUgdW5hZmZlY3RlZCBieVxuLy8gb3RoZXIgY29kZSBtb2RpZnlpbmcgc2V0VGltZW91dCAobGlrZSBzaW5vbi51c2VGYWtlVGltZXJzKCkpXG52YXIgc2V0VGltZW91dEZ1bmMgPSBzZXRUaW1lb3V0O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuLy8gUG9seWZpbGwgZm9yIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kXG5mdW5jdGlvbiBiaW5kKGZuLCB0aGlzQXJnKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBmbi5hcHBseSh0aGlzQXJnLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuZnVuY3Rpb24gUHJvbWlzZShmbikge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZSkpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZXMgbXVzdCBiZSBjb25zdHJ1Y3RlZCB2aWEgbmV3Jyk7XG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBUeXBlRXJyb3IoJ25vdCBhIGZ1bmN0aW9uJyk7XG4gIC8qKiBAdHlwZSB7IW51bWJlcn0gKi9cbiAgdGhpcy5fc3RhdGUgPSAwO1xuICAvKiogQHR5cGUgeyFib29sZWFufSAqL1xuICB0aGlzLl9oYW5kbGVkID0gZmFsc2U7XG4gIC8qKiBAdHlwZSB7UHJvbWlzZXx1bmRlZmluZWR9ICovXG4gIHRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xuICAvKiogQHR5cGUgeyFBcnJheTwhRnVuY3Rpb24+fSAqL1xuICB0aGlzLl9kZWZlcnJlZHMgPSBbXTtcblxuICBkb1Jlc29sdmUoZm4sIHRoaXMpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGUoc2VsZiwgZGVmZXJyZWQpIHtcbiAgd2hpbGUgKHNlbGYuX3N0YXRlID09PSAzKSB7XG4gICAgc2VsZiA9IHNlbGYuX3ZhbHVlO1xuICB9XG4gIGlmIChzZWxmLl9zdGF0ZSA9PT0gMCkge1xuICAgIHNlbGYuX2RlZmVycmVkcy5wdXNoKGRlZmVycmVkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgc2VsZi5faGFuZGxlZCA9IHRydWU7XG4gIFByb21pc2UuX2ltbWVkaWF0ZUZuKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYiA9IHNlbGYuX3N0YXRlID09PSAxID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkO1xuICAgIGlmIChjYiA9PT0gbnVsbCkge1xuICAgICAgKHNlbGYuX3N0YXRlID09PSAxID8gcmVzb2x2ZSA6IHJlamVjdCkoZGVmZXJyZWQucHJvbWlzZSwgc2VsZi5fdmFsdWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmV0O1xuICAgIHRyeSB7XG4gICAgICByZXQgPSBjYihzZWxmLl92YWx1ZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHJldCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHNlbGYsIG5ld1ZhbHVlKSB7XG4gIHRyeSB7XG4gICAgLy8gUHJvbWlzZSBSZXNvbHV0aW9uIFByb2NlZHVyZTogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMjdGhlLXByb21pc2UtcmVzb2x1dGlvbi1wcm9jZWR1cmVcbiAgICBpZiAobmV3VmFsdWUgPT09IHNlbGYpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIHByb21pc2UgY2Fubm90IGJlIHJlc29sdmVkIHdpdGggaXRzZWxmLicpO1xuICAgIGlmIChcbiAgICAgIG5ld1ZhbHVlICYmXG4gICAgICAodHlwZW9mIG5ld1ZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgbmV3VmFsdWUgPT09ICdmdW5jdGlvbicpXG4gICAgKSB7XG4gICAgICB2YXIgdGhlbiA9IG5ld1ZhbHVlLnRoZW47XG4gICAgICBpZiAobmV3VmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHNlbGYuX3N0YXRlID0gMztcbiAgICAgICAgc2VsZi5fdmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgZmluYWxlKHNlbGYpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRvUmVzb2x2ZShiaW5kKHRoZW4sIG5ld1ZhbHVlKSwgc2VsZik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgc2VsZi5fc3RhdGUgPSAxO1xuICAgIHNlbGYuX3ZhbHVlID0gbmV3VmFsdWU7XG4gICAgZmluYWxlKHNlbGYpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmVqZWN0KHNlbGYsIGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlamVjdChzZWxmLCBuZXdWYWx1ZSkge1xuICBzZWxmLl9zdGF0ZSA9IDI7XG4gIHNlbGYuX3ZhbHVlID0gbmV3VmFsdWU7XG4gIGZpbmFsZShzZWxmKTtcbn1cblxuZnVuY3Rpb24gZmluYWxlKHNlbGYpIHtcbiAgaWYgKHNlbGYuX3N0YXRlID09PSAyICYmIHNlbGYuX2RlZmVycmVkcy5sZW5ndGggPT09IDApIHtcbiAgICBQcm9taXNlLl9pbW1lZGlhdGVGbihmdW5jdGlvbigpIHtcbiAgICAgIGlmICghc2VsZi5faGFuZGxlZCkge1xuICAgICAgICBQcm9taXNlLl91bmhhbmRsZWRSZWplY3Rpb25GbihzZWxmLl92YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gc2VsZi5fZGVmZXJyZWRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaGFuZGxlKHNlbGYsIHNlbGYuX2RlZmVycmVkc1tpXSk7XG4gIH1cbiAgc2VsZi5fZGVmZXJyZWRzID0gbnVsbDtcbn1cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcHJvbWlzZSkge1xuICB0aGlzLm9uRnVsZmlsbGVkID0gdHlwZW9mIG9uRnVsZmlsbGVkID09PSAnZnVuY3Rpb24nID8gb25GdWxmaWxsZWQgOiBudWxsO1xuICB0aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsO1xuICB0aGlzLnByb21pc2UgPSBwcm9taXNlO1xufVxuXG4vKipcbiAqIFRha2UgYSBwb3RlbnRpYWxseSBtaXNiZWhhdmluZyByZXNvbHZlciBmdW5jdGlvbiBhbmQgbWFrZSBzdXJlXG4gKiBvbkZ1bGZpbGxlZCBhbmQgb25SZWplY3RlZCBhcmUgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBNYWtlcyBubyBndWFyYW50ZWVzIGFib3V0IGFzeW5jaHJvbnkuXG4gKi9cbmZ1bmN0aW9uIGRvUmVzb2x2ZShmbiwgc2VsZikge1xuICB2YXIgZG9uZSA9IGZhbHNlO1xuICB0cnkge1xuICAgIGZuKFxuICAgICAgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgIHJlc29sdmUoc2VsZiwgdmFsdWUpO1xuICAgICAgfSxcbiAgICAgIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgcmVqZWN0KHNlbGYsIHJlYXNvbik7XG4gICAgICB9XG4gICAgKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChzZWxmLCBleCk7XG4gIH1cbn1cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbihvblJlamVjdGVkKSB7XG4gIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3RlZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgLy8gQHRzLWlnbm9yZVxuICB2YXIgcHJvbSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG5vb3ApO1xuXG4gIGhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcHJvbSkpO1xuICByZXR1cm4gcHJvbTtcbn07XG5cblByb21pc2UucHJvdG90eXBlWydmaW5hbGx5J10gPSBmaW5hbGx5Q29uc3RydWN0b3I7XG5cblByb21pc2UuYWxsID0gZnVuY3Rpb24oYXJyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAoIWFyciB8fCB0eXBlb2YgYXJyLmxlbmd0aCA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlLmFsbCBhY2NlcHRzIGFuIGFycmF5Jyk7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pO1xuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aDtcblxuICAgIGZ1bmN0aW9uIHJlcyhpLCB2YWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh2YWwgJiYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgdmFyIHRoZW4gPSB2YWwudGhlbjtcbiAgICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRoZW4uY2FsbChcbiAgICAgICAgICAgICAgdmFsLFxuICAgICAgICAgICAgICBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgICAgICByZXMoaSwgdmFsKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhcmdzW2ldID0gdmFsO1xuICAgICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICByZWplY3QoZXgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzKGksIGFyZ3NbaV0pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgcmVzb2x2ZSh2YWx1ZSk7XG4gIH0pO1xufTtcblxuUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIFVzZSBwb2x5ZmlsbCBmb3Igc2V0SW1tZWRpYXRlIGZvciBwZXJmb3JtYW5jZSBnYWluc1xuUHJvbWlzZS5faW1tZWRpYXRlRm4gPVxuICAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIGZ1bmN0aW9uKGZuKSB7XG4gICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgIH0pIHx8XG4gIGZ1bmN0aW9uKGZuKSB7XG4gICAgc2V0VGltZW91dEZ1bmMoZm4sIDApO1xuICB9O1xuXG5Qcm9taXNlLl91bmhhbmRsZWRSZWplY3Rpb25GbiA9IGZ1bmN0aW9uIF91bmhhbmRsZWRSZWplY3Rpb25GbihlcnIpIHtcbiAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlKSB7XG4gICAgY29uc29sZS53YXJuKCdQb3NzaWJsZSBVbmhhbmRsZWQgUHJvbWlzZSBSZWplY3Rpb246JywgZXJyKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5XSEFUV0dGZXRjaCA9IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOlxuICAgICAgJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiZcbiAgICAgICdCbG9iJyBpbiBzZWxmICYmXG4gICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmV3IEJsb2IoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH07XG5cbiAgZnVuY3Rpb24gaXNEYXRhVmlldyhvYmopIHtcbiAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXTtcblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9XG4gICAgICBBcnJheUJ1ZmZlci5pc1ZpZXcgfHxcbiAgICAgIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5eX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpO1xuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fTtcblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXJzKSkge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgICB0aGlzLmFwcGVuZChoZWFkZXJbMF0sIGhlYWRlclsxXSk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSk7XG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSk7XG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV07XG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlICsgJywgJyArIHZhbHVlIDogdmFsdWU7XG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXTtcbiAgfTtcblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9O1xuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSk7XG4gIH07XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICBpdGVtcy5wdXNoKG5hbWUpO1xuICAgIH0pO1xuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfTtcblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGl0ZW1zLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfTtcblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfTtcblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcbiAgICAgIH07XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKTtcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYik7XG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpO1xuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpO1xuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpO1xuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpO1xuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSk7XG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5O1xuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJyc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHk7XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keTtcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5O1xuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKCk7XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpO1xuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKTtcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5ID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGJvZHkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04Jyk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpO1xuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKTtcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKTtcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXTtcblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gbWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHk7XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsO1xuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzO1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycyk7XG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZDtcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGU7XG4gICAgICB0aGlzLnNpZ25hbCA9IGlucHV0LnNpZ25hbDtcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0O1xuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KTtcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdzYW1lLW9yaWdpbic7XG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJyk7XG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsO1xuICAgIHRoaXMuc2lnbmFsID0gb3B0aW9ucy5zaWduYWwgfHwgdGhpcy5zaWduYWw7XG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGw7XG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpO1xuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywge2JvZHk6IHRoaXMuX2JvZHlJbml0fSlcbiAgfTtcblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgYm9keVxuICAgICAgLnRyaW0oKVxuICAgICAgLnNwbGl0KCcmJylcbiAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICAgIGlmIChieXRlcykge1xuICAgICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpO1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKTtcbiAgICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKCk7XG4gICAgLy8gUmVwbGFjZSBpbnN0YW5jZXMgb2YgXFxyXFxuIGFuZCBcXG4gZm9sbG93ZWQgYnkgYXQgbGVhc3Qgb25lIHNwYWNlIG9yIGhvcml6b250YWwgdGFiIHdpdGggYSBzcGFjZVxuICAgIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM3MjMwI3NlY3Rpb24tMy4yXG4gICAgdmFyIHByZVByb2Nlc3NlZEhlYWRlcnMgPSByYXdIZWFkZXJzLnJlcGxhY2UoL1xccj9cXG5bXFx0IF0rL2csICcgJyk7XG4gICAgcHJlUHJvY2Vzc2VkSGVhZGVycy5zcGxpdCgvXFxyP1xcbi8pLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpO1xuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpO1xuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpO1xuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKTtcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0JztcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzID09PSB1bmRlZmluZWQgPyAyMDAgOiBvcHRpb25zLnN0YXR1cztcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwO1xuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJztcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJyc7XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpO1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSk7XG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfTtcblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pO1xuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InO1xuICAgIHJldHVybiByZXNwb25zZVxuICB9O1xuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XTtcblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9O1xuXG4gIGV4cG9ydHMuRE9NRXhjZXB0aW9uID0gc2VsZi5ET01FeGNlcHRpb247XG4gIHRyeSB7XG4gICAgbmV3IGV4cG9ydHMuRE9NRXhjZXB0aW9uKCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGV4cG9ydHMuRE9NRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSwgbmFtZSkge1xuICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICB2YXIgZXJyb3IgPSBFcnJvcihtZXNzYWdlKTtcbiAgICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgICB9O1xuICAgIGV4cG9ydHMuRE9NRXhjZXB0aW9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbiAgICBleHBvcnRzLkRPTUV4Y2VwdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBleHBvcnRzLkRPTUV4Y2VwdGlvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZldGNoKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdCk7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnNpZ25hbCAmJiByZXF1ZXN0LnNpZ25hbC5hYm9ydGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IGV4cG9ydHMuRE9NRXhjZXB0aW9uKCdBYm9ydGVkJywgJ0Fib3J0RXJyb3InKSlcbiAgICAgIH1cblxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICBmdW5jdGlvbiBhYm9ydFhocigpIHtcbiAgICAgICAgeGhyLmFib3J0KCk7XG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJyk7XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSk7XG4gICAgICB9O1xuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKTtcbiAgICAgIH07XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSk7XG4gICAgICB9O1xuXG4gICAgICB4aHIub25hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IGV4cG9ydHMuRE9NRXhjZXB0aW9uKCdBYm9ydGVkJywgJ0Fib3J0RXJyb3InKSk7XG4gICAgICB9O1xuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpO1xuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnb21pdCcpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHJlcXVlc3Quc2lnbmFsKSB7XG4gICAgICAgIHJlcXVlc3Quc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgYWJvcnRYaHIpO1xuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBET05FIChzdWNjZXNzIG9yIGZhaWx1cmUpXG4gICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICByZXF1ZXN0LnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKCdhYm9ydCcsIGFib3J0WGhyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpO1xuICAgIH0pXG4gIH1cblxuICBmZXRjaC5wb2x5ZmlsbCA9IHRydWU7XG5cbiAgaWYgKCFzZWxmLmZldGNoKSB7XG4gICAgc2VsZi5mZXRjaCA9IGZldGNoO1xuICAgIHNlbGYuSGVhZGVycyA9IEhlYWRlcnM7XG4gICAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG4gIH1cblxuICBleHBvcnRzLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBleHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBleHBvcnRzLlJlc3BvbnNlID0gUmVzcG9uc2U7XG4gIGV4cG9ydHMuZmV0Y2ggPSBmZXRjaDtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCByYWZQb2x5ZmlsbCA9IHJlcXVpcmUoXCIuL3JhZi1wb2x5ZmlsbFwiKTtcbmNsYXNzIEFuaW1hdGlvblF1ZXVlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5za2lwID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYmluZGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMucmVxdWVzdEFuaW1hdGlvbklEID0gLTE7XG4gICAgICAgIHRoaXMuZnJhbWVzID0gbmV3IEFycmF5KCk7XG4gICAgICAgIHRoaXMuYmluZEN5Y2xlID0gdGhpcy5jeWNsZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJhZlByb3ZpZGVyID0gcmFmUG9seWZpbGwuR2V0UkFGKCk7XG4gICAgfVxuICAgIG5ldygpIHtcbiAgICAgICAgY29uc3QgbmV3RnJhbWUgPSBuZXcgQUZyYW1lKHRoaXMuZnJhbWVzLmxlbmd0aCwgdGhpcyk7XG4gICAgICAgIHRoaXMuZnJhbWVzLnB1c2gobmV3RnJhbWUpO1xuICAgICAgICByZXR1cm4gbmV3RnJhbWU7XG4gICAgfVxuICAgIGFkZChmKSB7XG4gICAgICAgIGYucXVldWVJbmRleCA9IHRoaXMuZnJhbWVzLmxlbmd0aDtcbiAgICAgICAgZi5xdWV1ZSA9IHRoaXM7XG4gICAgICAgIHRoaXMuZnJhbWVzLnB1c2goZik7XG4gICAgfVxuICAgIHJlc3VtZSgpIHtcbiAgICAgICAgdGhpcy5za2lwID0gZmFsc2U7XG4gICAgfVxuICAgIHBhdXNlKCkge1xuICAgICAgICB0aGlzLnNraXAgPSB0cnVlO1xuICAgIH1cbiAgICB1bmJpbmQoKSB7XG4gICAgICAgIGlmICghdGhpcy5iaW5kZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmFmUHJvdmlkZXIuY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5yZXF1ZXN0QW5pbWF0aW9uSUQpO1xuICAgIH1cbiAgICBiaW5kKCkge1xuICAgICAgICBpZiAodGhpcy5iaW5kZWQpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgdGhpcy5yZXF1ZXN0QW5pbWF0aW9uSUQgPSB0aGlzLnJhZlByb3ZpZGVyLnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmJpbmRDeWNsZSwgbnVsbCk7XG4gICAgICAgIHRoaXMuYmluZGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgY3ljbGUobXMpIHtcbiAgICAgICAgaWYgKHRoaXMuZnJhbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5iaW5kZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZyYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICBpZiAoIWYucGF1c2VkKCkpIHtcbiAgICAgICAgICAgICAgICBmLmFuaW1hdGUobXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5iaW5kKCk7XG4gICAgfVxufVxuZXhwb3J0cy5BbmltYXRpb25RdWV1ZSA9IEFuaW1hdGlvblF1ZXVlO1xuY2xhc3MgQUZyYW1lIHtcbiAgICBjb25zdHJ1Y3RvcihpbmRleCwgcXVldWUpIHtcbiAgICAgICAgdGhpcy5za2lwID0gZmFsc2U7XG4gICAgICAgIHRoaXMucXVldWUgPSBxdWV1ZTtcbiAgICAgICAgdGhpcy5xdWV1ZUluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tzID0gbmV3IEFycmF5KCk7XG4gICAgfVxuICAgIGFkZChjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICB9XG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLmxlbmd0aCA9IDA7XG4gICAgfVxuICAgIHBhdXNlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2tpcDtcbiAgICB9XG4gICAgcGF1c2UoKSB7XG4gICAgICAgIHRoaXMuc2tpcCA9IHRydWU7XG4gICAgfVxuICAgIHN0b3AoKSB7XG4gICAgICAgIHRoaXMucGF1c2UoKTtcbiAgICAgICAgaWYgKHRoaXMucXVldWVJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnF1ZXVlLmZyYW1lcy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5xdWV1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMucXVldWVJbmRleCA9IC0xO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdG90YWwgPSB0aGlzLnF1ZXVlLmZyYW1lcy5sZW5ndGg7XG4gICAgICAgIGlmICh0b3RhbCA9PSAxKSB7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlLmZyYW1lcy5wb3AoKTtcbiAgICAgICAgICAgIHRoaXMucXVldWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucXVldWUuZnJhbWVzW3RoaXMucXVldWVJbmRleF0gPSB0aGlzLnF1ZXVlLmZyYW1lc1t0b3RhbCAtIDFdO1xuICAgICAgICB0aGlzLnF1ZXVlLmZyYW1lcy5sZW5ndGggPSB0b3RhbCAtIDE7XG4gICAgICAgIHRoaXMucXVldWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBhbmltYXRlKHRzKSB7XG4gICAgICAgIGZvciAobGV0IGluZGV4IGluIHRoaXMuY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMuY2FsbGJhY2tzW2luZGV4XTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHRzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuQUZyYW1lID0gQUZyYW1lO1xuY2xhc3MgQ2hhbmdlTWFuYWdlciB7XG4gICAgc3RhdGljIGRyYWluVGFza3MocSwgd3JhcHBlcikge1xuICAgICAgICBsZXQgdGFzayA9IHEuc2hpZnQoKTtcbiAgICAgICAgd2hpbGUgKHRhc2spIHtcbiAgICAgICAgICAgIGlmICh3cmFwcGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgd3JhcHBlcih0YXNrKTtcbiAgICAgICAgICAgICAgICB0YXNrID0gcS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFzaygpO1xuICAgICAgICAgICAgdGFzayA9IHEuc2hpZnQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihxdWV1ZSkge1xuICAgICAgICB0aGlzLnJlYWRzID0gbmV3IEFycmF5KCk7XG4gICAgICAgIHRoaXMud3JpdGVzID0gbmV3IEFycmF5KCk7XG4gICAgICAgIHRoaXMucmVhZFN0YXRlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaW5SZWFkQ2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmluV3JpdGVDYWxsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZnJhbWUgPSBxdWV1ZS5uZXcoKTtcbiAgICB9XG4gICAgbXV0YXRlKGZuKSB7XG4gICAgICAgIHRoaXMud3JpdGVzLnB1c2goZm4pO1xuICAgICAgICB0aGlzLl9zY2hlZHVsZSgpO1xuICAgIH1cbiAgICByZWFkKGZuKSB7XG4gICAgICAgIHRoaXMucmVhZHMucHVzaChmbik7XG4gICAgICAgIHRoaXMuX3NjaGVkdWxlKCk7XG4gICAgfVxuICAgIF9zY2hlZHVsZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2NoZWR1bGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmZyYW1lLmFkZCh0aGlzLl9ydW5UYXNrcy5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgX3J1blRhc2tzKCkge1xuICAgICAgICBjb25zdCByZWFkRXJyb3IgPSB0aGlzLl9ydW5SZWFkcygpO1xuICAgICAgICBpZiAocmVhZEVycm9yICE9PSBudWxsICYmIHJlYWRFcnJvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRocm93IHJlYWRFcnJvcjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3cml0ZUVycm9yID0gdGhpcy5fcnVuV3JpdGVzKCk7XG4gICAgICAgIGlmICh3cml0ZUVycm9yICE9PSBudWxsICYmIHdyaXRlRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aHJvdyB3cml0ZUVycm9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJlYWRzLmxlbmd0aCA+IDAgfHwgdGhpcy53cml0ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgX3J1blJlYWRzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgQ2hhbmdlTWFuYWdlci5kcmFpblRhc2tzKHRoaXMucmVhZHMsIHRoaXMuX2V4ZWNSZWFkcy5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIF9leGVjUmVhZHModGFzaykge1xuICAgICAgICB0aGlzLmluUmVhZENhbGwgPSB0cnVlO1xuICAgICAgICB0YXNrKCk7XG4gICAgICAgIHRoaXMuaW5SZWFkQ2FsbCA9IGZhbHNlO1xuICAgIH1cbiAgICBfcnVuV3JpdGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgQ2hhbmdlTWFuYWdlci5kcmFpblRhc2tzKHRoaXMud3JpdGVzLCB0aGlzLl9leGVjV3JpdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBfZXhlY1dyaXRlKHRhc2spIHtcbiAgICAgICAgdGhpcy5pbldyaXRlQ2FsbCA9IHRydWU7XG4gICAgICAgIHRhc2soKTtcbiAgICAgICAgdGhpcy5pbldyaXRlQ2FsbCA9IGZhbHNlO1xuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFuaW1lLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xuY29uc3QgZXh0cyA9IHJlcXVpcmUoXCIuL2V4dGVuc2lvbnNcIik7XG5leHBvcnRzLkVMRU1FTlRfTk9ERSA9IDE7XG5leHBvcnRzLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgPSAxMTtcbmV4cG9ydHMuRE9DVU1FTlRfTk9ERSA9IDk7XG5leHBvcnRzLlRFWFRfTk9ERSA9IDM7XG5leHBvcnRzLkNPTU1FTlRfTk9ERSA9IDg7XG5jb25zdCBhdHRyaWJ1dGVzID0gdXRpbHNfMS5jcmVhdGVNYXAoKTtcbmF0dHJpYnV0ZXNbJ3N0eWxlJ10gPSBhcHBseVN0eWxlO1xuZnVuY3Rpb24gaXNEb2N1bWVudFJvb3Qobm9kZSkge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSAxMSB8fCBub2RlLm5vZGVUeXBlID09PSA5O1xufVxuZXhwb3J0cy5pc0RvY3VtZW50Um9vdCA9IGlzRG9jdW1lbnRSb290O1xuZnVuY3Rpb24gaXNFbGVtZW50KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMTtcbn1cbmV4cG9ydHMuaXNFbGVtZW50ID0gaXNFbGVtZW50O1xuZnVuY3Rpb24gaXNUZXh0KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMztcbn1cbmV4cG9ydHMuaXNUZXh0ID0gaXNUZXh0O1xuZnVuY3Rpb24gZ2V0QW5jZXN0cnkobm9kZSwgcm9vdCkge1xuICAgIGNvbnN0IGFuY2VzdHJ5ID0gW107XG4gICAgbGV0IGN1ciA9IG5vZGU7XG4gICAgd2hpbGUgKGN1ciAhPT0gcm9vdCkge1xuICAgICAgICBjb25zdCBuID0gY3VyO1xuICAgICAgICBhbmNlc3RyeS5wdXNoKG4pO1xuICAgICAgICBjdXIgPSBuLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBhbmNlc3RyeTtcbn1cbmV4cG9ydHMuZ2V0QW5jZXN0cnkgPSBnZXRBbmNlc3RyeTtcbmNvbnN0IGdldFJvb3ROb2RlID0gTm9kZS5wcm90b3R5cGUuZ2V0Um9vdE5vZGUgfHxcbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBjdXIgPSB0aGlzO1xuICAgICAgICBsZXQgcHJldiA9IGN1cjtcbiAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgcHJldiA9IGN1cjtcbiAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH07XG5mdW5jdGlvbiByZXZlcnNlQ29sbGVjdE5vZGVXaXRoQnJlYWR0aChwYXJlbnQsIG1hdGNoZXIsIG1hdGNoZXMpIHtcbiAgICBsZXQgY3VyID0gcGFyZW50Lmxhc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChtYXRjaGVyKGN1cikpIHtcbiAgICAgICAgICAgIG1hdGNoZXMucHVzaChjdXIpO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5wcmV2aW91c1NpYmxpbmc7XG4gICAgfVxufVxuZXhwb3J0cy5yZXZlcnNlQ29sbGVjdE5vZGVXaXRoQnJlYWR0aCA9IHJldmVyc2VDb2xsZWN0Tm9kZVdpdGhCcmVhZHRoO1xuZnVuY3Rpb24gcmV2ZXJzZUZpbmROb2RlV2l0aEJyZWFkdGgocGFyZW50LCBtYXRjaGVyKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5sYXN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBpZiAobWF0Y2hlcihjdXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5wcmV2aW91c1NpYmxpbmc7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5yZXZlcnNlRmluZE5vZGVXaXRoQnJlYWR0aCA9IHJldmVyc2VGaW5kTm9kZVdpdGhCcmVhZHRoO1xuZnVuY3Rpb24gY29sbGVjdE5vZGVXaXRoQnJlYWR0aChwYXJlbnQsIG1hdGNoZXIsIG1hdGNoZXMpIHtcbiAgICBsZXQgY3VyID0gcGFyZW50LmZpcnN0Q2hpbGQ7XG4gICAgaWYgKG1hdGNoZXIoY3VyKSkge1xuICAgICAgICBtYXRjaGVzLnB1c2goY3VyKTtcbiAgICB9XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBpZiAobWF0Y2hlcihjdXIubmV4dFNpYmxpbmcpKSB7XG4gICAgICAgICAgICBtYXRjaGVzLnB1c2goY3VyKTtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIubmV4dFNpYmxpbmc7XG4gICAgfVxufVxuZXhwb3J0cy5jb2xsZWN0Tm9kZVdpdGhCcmVhZHRoID0gY29sbGVjdE5vZGVXaXRoQnJlYWR0aDtcbmZ1bmN0aW9uIGNvbGxlY3ROb2RlV2l0aERlcHRoKHBhcmVudCwgbWF0Y2hlciwgbWF0Y2hlcykge1xuICAgIGxldCBjdXIgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChtYXRjaGVyKGN1cikpIHtcbiAgICAgICAgICAgIG1hdGNoZXMucHVzaChjdXIpO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5maXJzdENoaWxkO1xuICAgIH1cbn1cbmV4cG9ydHMuY29sbGVjdE5vZGVXaXRoRGVwdGggPSBjb2xsZWN0Tm9kZVdpdGhEZXB0aDtcbmZ1bmN0aW9uIGZpbmROb2RlV2l0aEJyZWFkdGgocGFyZW50LCBtYXRjaGVyKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgaWYgKG1hdGNoZXIoY3VyKSkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cjtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIubmV4dFNpYmxpbmc7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5maW5kTm9kZVdpdGhCcmVhZHRoID0gZmluZE5vZGVXaXRoQnJlYWR0aDtcbmZ1bmN0aW9uIGZpbmROb2RlV2l0aERlcHRoKHBhcmVudCwgbWF0Y2hlcikge1xuICAgIGxldCBjdXIgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChtYXRjaGVyKGN1cikpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXI7XG4gICAgICAgIH1cbiAgICAgICAgY3VyID0gY3VyLmZpcnN0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5maW5kTm9kZVdpdGhEZXB0aCA9IGZpbmROb2RlV2l0aERlcHRoO1xuZnVuY3Rpb24gZmluZERlcHRoRmlyc3QocGFyZW50LCBtYXRjaGVyKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZVdpdGhEZXB0aChjdXIsIG1hdGNoZXIpO1xuICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3VuZDtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIubmV4dFNpYmxpbmc7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5maW5kRGVwdGhGaXJzdCA9IGZpbmREZXB0aEZpcnN0O1xuZnVuY3Rpb24gY29sbGVjdERlcHRoRmlyc3QocGFyZW50LCBtYXRjaGVyLCBtYXRjaGVzKSB7XG4gICAgbGV0IGN1ciA9IHBhcmVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgY29sbGVjdE5vZGVXaXRoRGVwdGgoY3VyLCBtYXRjaGVyLCBtYXRjaGVzKTtcbiAgICAgICAgY3VyID0gY3VyLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgICByZXR1cm47XG59XG5leHBvcnRzLmNvbGxlY3REZXB0aEZpcnN0ID0gY29sbGVjdERlcHRoRmlyc3Q7XG5mdW5jdGlvbiBmaW5kQnJlYWR0aEZpcnN0KHBhcmVudCwgbWF0Y2hlcikge1xuICAgIGxldCBjdXIgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVXaXRoQnJlYWR0aChjdXIsIG1hdGNoZXIpO1xuICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3VuZDtcbiAgICAgICAgfVxuICAgICAgICBjdXIgPSBjdXIuZmlyc3RDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5leHBvcnRzLmZpbmRCcmVhZHRoRmlyc3QgPSBmaW5kQnJlYWR0aEZpcnN0O1xuZnVuY3Rpb24gY29sbGVjdEJyZWFkdGhGaXJzdChwYXJlbnQsIG1hdGNoZXIsIG1hdGNoZXMpIHtcbiAgICBsZXQgY3VyID0gcGFyZW50LmZpcnN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1cikge1xuICAgICAgICBjb2xsZWN0Tm9kZVdpdGhCcmVhZHRoKGN1ciwgbWF0Y2hlciwgbWF0Y2hlcyk7XG4gICAgICAgIGN1ciA9IGN1ci5maXJzdENoaWxkO1xuICAgIH1cbiAgICByZXR1cm47XG59XG5leHBvcnRzLmNvbGxlY3RCcmVhZHRoRmlyc3QgPSBjb2xsZWN0QnJlYWR0aEZpcnN0O1xuZnVuY3Rpb24gZ2V0QWN0aXZlRWxlbWVudChub2RlKSB7XG4gICAgY29uc3Qgcm9vdCA9IGdldFJvb3ROb2RlLmNhbGwobm9kZSk7XG4gICAgcmV0dXJuIGlzRG9jdW1lbnRSb290KHJvb3QpID8gcm9vdC5hY3RpdmVFbGVtZW50IDogbnVsbDtcbn1cbmV4cG9ydHMuZ2V0QWN0aXZlRWxlbWVudCA9IGdldEFjdGl2ZUVsZW1lbnQ7XG5mdW5jdGlvbiBnZXRGb2N1c2VkUGF0aChub2RlLCByb290KSB7XG4gICAgY29uc3QgYWN0aXZlRWxlbWVudCA9IGdldEFjdGl2ZUVsZW1lbnQobm9kZSk7XG4gICAgaWYgKCFhY3RpdmVFbGVtZW50IHx8ICFub2RlLmNvbnRhaW5zKGFjdGl2ZUVsZW1lbnQpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIGdldEFuY2VzdHJ5KGFjdGl2ZUVsZW1lbnQsIHJvb3QpO1xufVxuZXhwb3J0cy5nZXRGb2N1c2VkUGF0aCA9IGdldEZvY3VzZWRQYXRoO1xuZnVuY3Rpb24gbW92ZUJlZm9yZShwYXJlbnROb2RlLCBub2RlLCByZWZlcmVuY2VOb2RlKSB7XG4gICAgY29uc3QgaW5zZXJ0UmVmZXJlbmNlTm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgbGV0IGN1ciA9IHJlZmVyZW5jZU5vZGU7XG4gICAgd2hpbGUgKGN1ciAhPT0gbnVsbCAmJiBjdXIgIT09IG5vZGUpIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IGN1ci5uZXh0U2libGluZztcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY3VyLCBpbnNlcnRSZWZlcmVuY2VOb2RlKTtcbiAgICAgICAgY3VyID0gbmV4dDtcbiAgICB9XG59XG5leHBvcnRzLm1vdmVCZWZvcmUgPSBtb3ZlQmVmb3JlO1xuZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5vZGUsIHJlZmVyZW5jZU5vZGUpIHtcbiAgICBpZiAocmVmZXJlbmNlTm9kZSA9PT0gbnVsbCkge1xuICAgICAgICBwYXJlbnROb2RlLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgcmVmZXJlbmNlTm9kZSk7XG4gICAgcmV0dXJuIG51bGw7XG59XG5leHBvcnRzLmluc2VydEJlZm9yZSA9IGluc2VydEJlZm9yZTtcbmZ1bmN0aW9uIHJlcGxhY2VOb2RlKHBhcmVudE5vZGUsIG5vZGUsIHJlcGxhY2VtZW50KSB7XG4gICAgaWYgKHJlcGxhY2VtZW50ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChyZXBsYWNlbWVudCwgbm9kZSk7XG4gICAgcmV0dXJuIG51bGw7XG59XG5leHBvcnRzLnJlcGxhY2VOb2RlID0gcmVwbGFjZU5vZGU7XG5mdW5jdGlvbiByZXBsYWNlTm9kZUlmKHRhcmdldE5vZGUsIHJlcGxhY2VtZW50KSB7XG4gICAgaWYgKHJlcGxhY2VtZW50ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgcGFyZW50ID0gdGFyZ2V0Tm9kZS5wYXJlbnROb2RlO1xuICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcGFyZW50LnJlcGxhY2VDaGlsZChyZXBsYWNlbWVudCwgdGFyZ2V0Tm9kZSk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5leHBvcnRzLnJlcGxhY2VOb2RlSWYgPSByZXBsYWNlTm9kZUlmO1xuZnVuY3Rpb24gZ2V0TmFtZXNwYWNlKG5hbWUpIHtcbiAgICBpZiAobmFtZS5sYXN0SW5kZXhPZigneG1sOicsIDApID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlJztcbiAgICB9XG4gICAgaWYgKG5hbWUubGFzdEluZGV4T2YoJ3hsaW5rOicsIDApID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayc7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmdldE5hbWVzcGFjZSA9IGdldE5hbWVzcGFjZTtcbmZ1bmN0aW9uIGFwcGx5QXR0cihlbCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjb25zdCBhdHRyTlMgPSBnZXROYW1lc3BhY2UobmFtZSk7XG4gICAgICAgIGlmIChhdHRyTlMpIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKGF0dHJOUywgbmFtZSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFwcGx5QXR0ciA9IGFwcGx5QXR0cjtcbmZ1bmN0aW9uIGFwcGx5QXR0cnMoZWwsIHZhbHVlcykge1xuICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHZhbHVlc1trZXldID09IG51bGwpIHtcbiAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKGtleSwgdmFsdWVzW2tleV0pO1xuICAgIH1cbn1cbmV4cG9ydHMuYXBwbHlBdHRycyA9IGFwcGx5QXR0cnM7XG5mdW5jdGlvbiBhcHBseVByb3AoZWwsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxbbmFtZV0gPSB2YWx1ZTtcbn1cbmV4cG9ydHMuYXBwbHlQcm9wID0gYXBwbHlQcm9wO1xuZnVuY3Rpb24gc2V0U3R5bGVWYWx1ZShzdHlsZSwgcHJvcCwgdmFsdWUpIHtcbiAgICBpZiAocHJvcC5pbmRleE9mKCctJykgPj0gMCkge1xuICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wLCB2YWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzdHlsZVtwcm9wXSA9IHZhbHVlO1xuICAgIH1cbn1cbmV4cG9ydHMuc2V0U3R5bGVWYWx1ZSA9IHNldFN0eWxlVmFsdWU7XG5mdW5jdGlvbiBhcHBseVNWR1N0eWxlKGVsLCBuYW1lLCBzdHlsZSkge1xuICAgIGlmICh0eXBlb2Ygc3R5bGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSAnJztcbiAgICAgICAgY29uc3QgZWxTdHlsZSA9IGVsLnN0eWxlO1xuICAgICAgICBmb3IgKGNvbnN0IHByb3AgaW4gc3R5bGUpIHtcbiAgICAgICAgICAgIGlmICh1dGlsc18xLmhhcyhzdHlsZSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBzZXRTdHlsZVZhbHVlKGVsU3R5bGUsIHByb3AsIHN0eWxlW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuYXBwbHlTVkdTdHlsZSA9IGFwcGx5U1ZHU3R5bGU7XG5mdW5jdGlvbiBhcHBseVN0eWxlKGVsLCBuYW1lLCBzdHlsZSkge1xuICAgIGlmICh0eXBlb2Ygc3R5bGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSAnJztcbiAgICAgICAgY29uc3QgZWxTdHlsZSA9IGVsLnN0eWxlO1xuICAgICAgICBmb3IgKGNvbnN0IHByb3AgaW4gc3R5bGUpIHtcbiAgICAgICAgICAgIGlmICh1dGlsc18xLmhhcyhzdHlsZSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBzZXRTdHlsZVZhbHVlKGVsU3R5bGUsIHByb3AsIHN0eWxlW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuYXBwbHlTdHlsZSA9IGFwcGx5U3R5bGU7XG5mdW5jdGlvbiBhcHBseVN0eWxlcyhlbCwgc3R5bGUpIHtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gJyc7XG4gICAgICAgIGNvbnN0IGVsU3R5bGUgPSBlbC5zdHlsZTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAodXRpbHNfMS5oYXMoc3R5bGUsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgc2V0U3R5bGVWYWx1ZShlbFN0eWxlLCBwcm9wLCBzdHlsZVtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFwcGx5U3R5bGVzID0gYXBwbHlTdHlsZXM7XG5mdW5jdGlvbiBhcHBseVNWR1N0eWxlcyhlbCwgc3R5bGUpIHtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gJyc7XG4gICAgICAgIGNvbnN0IGVsU3R5bGUgPSBlbC5zdHlsZTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAodXRpbHNfMS5oYXMoc3R5bGUsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgc2V0U3R5bGVWYWx1ZShlbFN0eWxlLCBwcm9wLCBzdHlsZVtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFwcGx5U1ZHU3R5bGVzID0gYXBwbHlTVkdTdHlsZXM7XG5mdW5jdGlvbiBhcHBseUF0dHJpYnV0ZVR5cGVkKGVsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gICAgaWYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYXBwbHlQcm9wKGVsLCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhcHBseUF0dHIoZWwsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG59XG5leHBvcnRzLmFwcGx5QXR0cmlidXRlVHlwZWQgPSBhcHBseUF0dHJpYnV0ZVR5cGVkO1xuZnVuY3Rpb24gZ2V0TmFtZXNwYWNlRm9yVGFnKHRhZywgcGFyZW50KSB7XG4gICAgaWYgKHRhZyA9PT0gJ3N2ZycpIHtcbiAgICAgICAgcmV0dXJuICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG4gICAgfVxuICAgIGlmICh0YWcgPT09ICdtYXRoJykge1xuICAgICAgICByZXR1cm4gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTgvTWF0aC9NYXRoTUwnO1xuICAgIH1cbiAgICBpZiAocGFyZW50ID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBwYXJlbnQubmFtZXNwYWNlVVJJO1xufVxuZXhwb3J0cy5nZXROYW1lc3BhY2VGb3JUYWcgPSBnZXROYW1lc3BhY2VGb3JUYWc7XG5mdW5jdGlvbiByZWNvcmRBdHRyaWJ1dGVzKG5vZGUpIHtcbiAgICBjb25zdCBhdHRycyA9IHt9O1xuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXM7XG4gICAgY29uc3QgbGVuZ3RoID0gYXR0cmlidXRlcy5sZW5ndGg7XG4gICAgaWYgKCFsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGF0dHJzO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMCwgaiA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSwgaiArPSAyKSB7XG4gICAgICAgIGNvbnN0IGF0dHIgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgICBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJzO1xufVxuZXhwb3J0cy5yZWNvcmRBdHRyaWJ1dGVzID0gcmVjb3JkQXR0cmlidXRlcztcbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQoZG9jLCBuYW1lT3JDdG9yLCBrZXksIGNvbnRlbnQsIGF0dHJpYnV0ZXMsIG5hbWVzcGFjZSkge1xuICAgIGxldCBlbDtcbiAgICBpZiAodHlwZW9mIG5hbWVPckN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZWwgPSBuZXcgbmFtZU9yQ3RvcigpO1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfVxuICAgIG5hbWVzcGFjZSA9IG5hbWVzcGFjZS50cmltKCk7XG4gICAgaWYgKG5hbWVzcGFjZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHN3aXRjaCAobmFtZU9yQ3Rvcikge1xuICAgICAgICAgICAgY2FzZSAnc3ZnJzpcbiAgICAgICAgICAgICAgICBlbCA9IGRvYy5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbmFtZU9yQ3Rvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtYXRoJzpcbiAgICAgICAgICAgICAgICBlbCA9IGRvYy5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTgvTWF0aC9NYXRoTUwnLCBuYW1lT3JDdG9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgZWwgPSBkb2MuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZSwgbmFtZU9yQ3Rvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnQobmFtZU9yQ3Rvcik7XG4gICAgfVxuICAgIGVsLnNldEF0dHJpYnV0ZSgnX2tleScsIGtleSk7XG4gICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgYXBwbHlBdHRycyhlbCwgYXR0cmlidXRlcyk7XG4gICAgfVxuICAgIGlmIChjb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gY29udGVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gY3JlYXRlRWxlbWVudDtcbmZ1bmN0aW9uIGNyZWF0ZVRleHQoZG9jLCB0ZXh0LCBrZXkpIHtcbiAgICBjb25zdCBub2RlID0gZG9jLmNyZWF0ZVRleHROb2RlKHRleHQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ2tleScsIGtleSk7XG4gICAgcmV0dXJuIG5vZGU7XG59XG5leHBvcnRzLmNyZWF0ZVRleHQgPSBjcmVhdGVUZXh0O1xuZnVuY3Rpb24gcmVtb3ZlRnJvbU5vZGUoZnJvbU5vZGUsIGVuZE5vZGUpIHtcbiAgICBjb25zdCBwYXJlbnROb2RlID0gZnJvbU5vZGUucGFyZW50Tm9kZTtcbiAgICBsZXQgY2hpbGQgPSBmcm9tTm9kZTtcbiAgICB3aGlsZSAoY2hpbGQgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IGNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNoaWxkKTtcbiAgICAgICAgY2hpbGQgPSBuZXh0O1xuICAgIH1cbn1cbmV4cG9ydHMucmVtb3ZlRnJvbU5vZGUgPSByZW1vdmVGcm9tTm9kZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRvbS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBPYmplY3RzO1xuKGZ1bmN0aW9uIChPYmplY3RzKSB7XG4gICAgZnVuY3Rpb24gUGF0Y2hXaXRoKGVsZW0sIGF0dHJOYW1lLCBhdHRycykge1xuICAgICAgICBlbGVtW2F0dHJOYW1lXSA9IGF0dHJzO1xuICAgIH1cbiAgICBPYmplY3RzLlBhdGNoV2l0aCA9IFBhdGNoV2l0aDtcbiAgICBmdW5jdGlvbiBHZXRBdHRyV2l0aChlbGVtLCBhdHRyTmFtZSkge1xuICAgICAgICByZXR1cm4gZWxlbVthdHRyTmFtZV07XG4gICAgfVxuICAgIE9iamVjdHMuR2V0QXR0cldpdGggPSBHZXRBdHRyV2l0aDtcbiAgICBmdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChlbGVtKSB7XG4gICAgICAgIHJldHVybiBlbGVtID09PSBudWxsIHx8IGVsZW0gPT09IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgT2JqZWN0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuICAgIGZ1bmN0aW9uIGlzQW55KGVsZW0sIC4uLnZhbHVlcykge1xuICAgICAgICBmb3IgKGxldCBpbmRleCBvZiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIGlmIChlbGVtID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgT2JqZWN0cy5pc0FueSA9IGlzQW55O1xufSkoT2JqZWN0cyA9IGV4cG9ydHMuT2JqZWN0cyB8fCAoZXhwb3J0cy5PYmplY3RzID0ge30pKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWV4dGVuc2lvbnMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBmZXRjaCA9IHJlcXVpcmUoXCJ3aGF0d2ctZmV0Y2hcIik7XG5leHBvcnRzLmZldGNoQVBJID0ge1xuICAgIGZldGNoOiBzZWxmLmZldGNoLFxuICAgIEhlYWRlcnM6IHNlbGYuSGVhZGVycyxcbiAgICBSZXF1ZXN0OiBzZWxmLlJlcXVlc3QsXG4gICAgUmVzcG9uc2U6IHNlbGYuUmVzcG9uc2UsXG4gICAgRE9NRXhjZXB0aW9uOiBzZWxmLkRPTUV4Y2VwdGlvbixcbn07XG5pZiAoIXNlbGYuZmV0Y2gpIHtcbiAgICBleHBvcnRzLmZldGNoQVBJLmZldGNoID0gZmV0Y2guZmV0Y2g7XG4gICAgZXhwb3J0cy5mZXRjaEFQSS5IZWFkZXJzID0gZmV0Y2guSGVhZGVycztcbiAgICBleHBvcnRzLmZldGNoQVBJLlJlcXVlc3QgPSBmZXRjaC5SZXF1ZXN0O1xuICAgIGV4cG9ydHMuZmV0Y2hBUEkuUmVzcG9uc2UgPSBmZXRjaC5SZXNwb25zZTtcbiAgICBleHBvcnRzLmZldGNoQVBJLkRPTUV4Y2VwdGlvbiA9IGZldGNoLkRPTUV4Y2VwdGlvbjtcbiAgICBzZWxmLmZldGNoID0gZmV0Y2guZmV0Y2g7XG4gICAgc2VsZi5IZWFkZXJzID0gZmV0Y2guSGVhZGVycztcbiAgICBzZWxmLlJlcXVlc3QgPSBmZXRjaC5SZXF1ZXN0O1xuICAgIHNlbGYuUmVzcG9uc2UgPSBmZXRjaC5SZXNwb25zZTtcbiAgICBzZWxmLkRPTUV4Y2VwdGlvbiA9IGZldGNoLkRPTUV4Y2VwdGlvbjtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZldGNoLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0ge307XG4vLyMgc291cmNlTWFwcGluZ1VSTD1odHRwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZnVuY3Rpb24gTGluZWFyU3VtKHAwLCBwMSwgdCkge1xuICAgIHJldHVybiAocDEgLSBwMCkgKiB0ICsgcDA7XG59XG5leHBvcnRzLkxpbmVhclN1bSA9IExpbmVhclN1bTtcbmZ1bmN0aW9uIEJlcm5zdGVpbkRpdmlzaW9uKG4sIGkpIHtcbiAgICBjb25zdCBmYyA9IEZhY3RvcmlhbEdlbmVyYXRvcigpO1xuICAgIHJldHVybiBmYyhuKSAvIGZjKGkpIC8gZmMobiAtIGkpO1xufVxuZXhwb3J0cy5CZXJuc3RlaW5EaXZpc2lvbiA9IEJlcm5zdGVpbkRpdmlzaW9uO1xuZnVuY3Rpb24gRmFjdG9yaWFsR2VuZXJhdG9yKCkge1xuICAgIGNvbnN0IGEgPSBbMV07XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChuKSB7XG4gICAgICAgIGxldCBzID0gMTtcbiAgICAgICAgaWYgKGFbbl0pIHtcbiAgICAgICAgICAgIHJldHVybiBhW25dO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSBuOyBpID4gMTsgaS0tKSB7XG4gICAgICAgICAgICBzICo9IGk7XG4gICAgICAgIH1cbiAgICAgICAgYVtuXSA9IHM7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH07XG59XG5leHBvcnRzLkZhY3RvcmlhbEdlbmVyYXRvciA9IEZhY3RvcmlhbEdlbmVyYXRvcjtcbmZ1bmN0aW9uIENhdG11bGxSb21TdW0ocDAsIHAxLCBwMiwgcDMsIHQpIHtcbiAgICB2YXIgdjAgPSAocDIgLSBwMCkgKiAwLjU7XG4gICAgdmFyIHYxID0gKHAzIC0gcDEpICogMC41O1xuICAgIHZhciB0MiA9IHQgKiB0O1xuICAgIHZhciB0MyA9IHQgKiB0MjtcbiAgICByZXR1cm4gKDIgKiBwMSAtIDIgKiBwMiArIHYwICsgdjEpICogdDMgKyAoLTMgKiBwMSArIDMgKiBwMiAtIDIgKiB2MCAtIHYxKSAqIHQyICsgdjAgKiB0ICsgcDE7XG59XG5leHBvcnRzLkNhdG11bGxSb21TdW0gPSBDYXRtdWxsUm9tU3VtO1xuZnVuY3Rpb24gTGluZWFyKHYsIGspIHtcbiAgICBjb25zdCBtID0gdi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGYgPSBtICogaztcbiAgICBjb25zdCBpID0gTWF0aC5mbG9vcihmKTtcbiAgICBpZiAoayA8IDApIHtcbiAgICAgICAgcmV0dXJuIExpbmVhclN1bSh2WzBdLCB2WzFdLCBmKTtcbiAgICB9XG4gICAgaWYgKGsgPiAxKSB7XG4gICAgICAgIHJldHVybiBMaW5lYXJTdW0odlttXSwgdlttIC0gMV0sIG0gLSBmKTtcbiAgICB9XG4gICAgcmV0dXJuIExpbmVhclN1bSh2W2ldLCB2W2kgKyAxID4gbSA/IG0gOiBpICsgMV0sIGYgLSBpKTtcbn1cbmV4cG9ydHMuTGluZWFyID0gTGluZWFyO1xuZnVuY3Rpb24gQmV6aWVyKHYsIGspIHtcbiAgICBjb25zdCBuID0gdi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHB3ID0gTWF0aC5wb3c7XG4gICAgbGV0IGIgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IG47IGkrKykge1xuICAgICAgICBiICs9IHB3KDEgLSBrLCBuIC0gaSkgKiBwdyhrLCBpKSAqIHZbaV0gKiBCZXJuc3RlaW5EaXZpc2lvbihuLCBpKTtcbiAgICB9XG4gICAgcmV0dXJuIGI7XG59XG5leHBvcnRzLkJlemllciA9IEJlemllcjtcbmZ1bmN0aW9uIENhdG11bGxSb20odiwgaykge1xuICAgIGNvbnN0IG0gPSB2Lmxlbmd0aCAtIDE7XG4gICAgbGV0IGYgPSBtICogaztcbiAgICBsZXQgaSA9IE1hdGguZmxvb3IoZik7XG4gICAgaWYgKHZbMF0gPT09IHZbbV0pIHtcbiAgICAgICAgaWYgKGsgPCAwKSB7XG4gICAgICAgICAgICBmID0gbSAqICgxICsgayk7XG4gICAgICAgICAgICBpID0gTWF0aC5mbG9vcihmKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQ2F0bXVsbFJvbVN1bSh2WyhpIC0gMSArIG0pICUgbV0sIHZbaV0sIHZbKGkgKyAxKSAlIG1dLCB2WyhpICsgMikgJSBtXSwgZiAtIGkpO1xuICAgIH1cbiAgICBpZiAoayA8IDApIHtcbiAgICAgICAgcmV0dXJuIHZbMF0gLSAoQ2F0bXVsbFJvbVN1bSh2WzBdLCB2WzBdLCB2WzFdLCB2WzFdLCAtZikgLSB2WzBdKTtcbiAgICB9XG4gICAgaWYgKGsgPiAxKSB7XG4gICAgICAgIHJldHVybiB2W21dIC0gKENhdG11bGxSb21TdW0odlttXSwgdlttXSwgdlttIC0gMV0sIHZbbSAtIDFdLCBmIC0gbSkgLSB2W21dKTtcbiAgICB9XG4gICAgcmV0dXJuIENhdG11bGxSb21TdW0odltpID8gaSAtIDEgOiAwXSwgdltpXSwgdlttIDwgaSArIDEgPyBtIDogaSArIDFdLCB2W20gPCBpICsgMiA/IG0gOiBpICsgMl0sIGYgLSBpKTtcbn1cbmV4cG9ydHMuQ2F0bXVsbFJvbSA9IENhdG11bGxSb207XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbnRlcnBvbGF0aW9ucy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNsYXNzIERPTU1vdW50IHtcbiAgICBjb25zdHJ1Y3Rvcihkb2N1bWVudCwgdGFyZ2V0KSB7XG4gICAgICAgIHRoaXMuZG9jID0gZG9jdW1lbnQ7XG4gICAgICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSB0YXJnZXQ7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5kb2MucXVlcnlTZWxlY3Rvcih0YXJnZXRTZWxlY3Rvcik7XG4gICAgICAgICAgICBpZiAobm9kZSA9PT0gbnVsbCB8fCBub2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuYWJsZSB0byBsb2NhdGUgbm9kZSBmb3IgJHt7IHRhcmdldFNlbGVjdG9yIH19YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1vdW50Tm9kZSA9IG5vZGU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5tb3VudE5vZGUgPSB0YXJnZXQ7XG4gICAgfVxuICAgIHVwZGF0ZShjaGFuZ2VzKSB7IH1cbiAgICBzdHJlYW0oY2hhbmdlcykgeyB9XG59XG5leHBvcnRzLkRPTU1vdW50ID0gRE9NTW91bnQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tb3VudC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoXCIuL2RvbVwiKTtcbmNvbnN0IGV4dHMgPSByZXF1aXJlKFwiLi9leHRlbnNpb25zXCIpO1xuY29uc3QgZG9tXzEgPSByZXF1aXJlKFwiLi9kb21cIik7XG5leHBvcnRzLkRlZmF1bHROb2RlRGljdGF0b3IgPSB7XG4gICAgU2FtZTogKG4sIG0pID0+IHtcbiAgICAgICAgcmV0dXJuIG4ubm9kZVR5cGUgPT0gbS5ub2RlVHlwZSAmJiBuLm5vZGVOYW1lID09IG0ubm9kZU5hbWU7XG4gICAgfSxcbiAgICBDaGFuZ2VkOiAobiwgbSkgPT4ge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbn07XG5mdW5jdGlvbiBmaW5kRWxlbWVudChkZXNjLCBwYXJlbnQpIHtcbiAgICBjb25zdCBzZWxlY3RvciA9IGRlc2MubmFtZSArICcjJyArIGRlc2MuaWQ7XG4gICAgY29uc3QgdGFyZ2V0cyA9IHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICBpZiAodGFyZ2V0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbGV0IGF0dHJTZWxlY3RvciA9IGRlc2MubmFtZSArIGBbX3RpZD0nJHtkZXNjLnRpZH0nXWA7XG4gICAgICAgIGxldCB0YXJnZXQgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihhdHRyU2VsZWN0b3IpO1xuICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICB9XG4gICAgICAgIGF0dHJTZWxlY3RvciA9IGRlc2MubmFtZSArIGBbX2F0aWQ9JyR7ZGVzYy5hdGlkfSddYDtcbiAgICAgICAgdGFyZ2V0ID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoYXR0clNlbGVjdG9yKTtcbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgfVxuICAgICAgICBhdHRyU2VsZWN0b3IgPSBkZXNjLm5hbWUgKyBgW19yZWY9JyR7ZGVzYy5yZWZ9J11gO1xuICAgICAgICByZXR1cm4gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoYXR0clNlbGVjdG9yKTtcbiAgICB9XG4gICAgaWYgKHRhcmdldHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXRzWzBdO1xuICAgIH1cbiAgICBjb25zdCB0b3RhbCA9IHRhcmdldHMubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWw7IGkrKykge1xuICAgICAgICBjb25zdCBlbGVtID0gdGFyZ2V0cy5pdGVtKGkpO1xuICAgICAgICBpZiAoZWxlbS5nZXRBdHRyaWJ1dGUoJ190aWQnKSA9PT0gZGVzYy50aWQpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtLmdldEF0dHJpYnV0ZSgnX2F0aWQnKSA9PT0gZGVzYy5hdGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbS5nZXRBdHRyaWJ1dGUoJ19yZWYnKSA9PT0gZGVzYy5yZWYpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5maW5kRWxlbWVudCA9IGZpbmRFbGVtZW50O1xuZnVuY3Rpb24gZmluZEVsZW1lbnRieVJlZihyZWYsIHBhcmVudCkge1xuICAgIGNvbnN0IGlkcyA9IHJlZi5zcGxpdCgnLycpLm1hcChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBpZiAoZWxlbS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcjJyArIGVsZW07XG4gICAgfSk7XG4gICAgaWYgKGlkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChpZHNbMF0gPT09ICcnIHx8IGlkc1swXS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIGlkcy5zaGlmdCgpO1xuICAgIH1cbiAgICBjb25zdCBmaXJzdCA9IGlkc1swXTtcbiAgICBpZiAocGFyZW50LmlkID09IGZpcnN0LnN1YnN0cigxKSkge1xuICAgICAgICBpZHMuc2hpZnQoKTtcbiAgICB9XG4gICAgbGV0IGN1ciA9IHBhcmVudC5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbn1cbmV4cG9ydHMuZmluZEVsZW1lbnRieVJlZiA9IGZpbmRFbGVtZW50YnlSZWY7XG5mdW5jdGlvbiBmaW5kRWxlbWVudFBhcmVudGJ5UmVmKHJlZiwgcGFyZW50KSB7XG4gICAgY29uc3QgaWRzID0gcmVmLnNwbGl0KCcvJykubWFwKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGlmIChlbGVtLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyMnICsgZWxlbTtcbiAgICB9KTtcbiAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKGlkc1swXSA9PT0gJycgfHwgaWRzWzBdLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgaWRzLnNoaWZ0KCk7XG4gICAgfVxuICAgIGlkcy5wb3AoKTtcbiAgICBjb25zdCBmaXJzdCA9IGlkc1swXTtcbiAgICBpZiAocGFyZW50LmlkID09IGZpcnN0LnN1YnN0cigxKSkge1xuICAgICAgICBpZHMuc2hpZnQoKTtcbiAgICB9XG4gICAgbGV0IGN1ciA9IHBhcmVudC5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyO1xuICAgICAgICB9XG4gICAgICAgIGN1ciA9IGN1ci5xdWVyeVNlbGVjdG9yKGlkcy5zaGlmdCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1cjtcbn1cbmV4cG9ydHMuZmluZEVsZW1lbnRQYXJlbnRieVJlZiA9IGZpbmRFbGVtZW50UGFyZW50YnlSZWY7XG5leHBvcnRzLkRlZmF1bHRKU09ORGljdGF0b3IgPSB7XG4gICAgU2FtZTogKG4sIG0pID0+IHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgQ2hhbmdlZDogKG4sIG0pID0+IHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG59O1xuZXhwb3J0cy5EZWZhdWx0SlNPTk1ha2VyID0ge1xuICAgIE1ha2U6IGpzb25NYWtlcixcbn07XG5mdW5jdGlvbiBqc29uTWFrZXIoZG9jLCBkZXNjTm9kZSwgc2hhbGxvdywgc2tpcFJlbW92ZWQpIHtcbiAgICBpZiAoZGVzY05vZGUudHlwZSA9PT0gZG9tXzEuQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBkb2MuY3JlYXRlQ29tbWVudChkZXNjTm9kZS5jb250ZW50KTtcbiAgICAgICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX2lkJywgZGVzY05vZGUuaWQpO1xuICAgICAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKG5vZGUsICdfcmVmJywgZGVzY05vZGUucmVmKTtcbiAgICAgICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX3RpZCcsIGRlc2NOb2RlLnRpZCk7XG4gICAgICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19hdGlkJywgZGVzY05vZGUuYXRpZCk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBpZiAoZGVzY05vZGUudHlwZSA9PT0gZG9tXzEuVEVYVF9OT0RFKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBkb2MuY3JlYXRlVGV4dE5vZGUoZGVzY05vZGUuY29udGVudCk7XG4gICAgICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19pZCcsIGRlc2NOb2RlLmlkKTtcbiAgICAgICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX3JlZicsIGRlc2NOb2RlLnJlZik7XG4gICAgICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ190aWQnLCBkZXNjTm9kZS50aWQpO1xuICAgICAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKG5vZGUsICdfYXRpZCcsIGRlc2NOb2RlLmF0aWQpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbGV0IG5vZGU7XG4gICAgaWYgKGRlc2NOb2RlLm5hbWVzcGFjZS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGRlc2NOb2RlLm5hbWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50TlMoZGVzY05vZGUubmFtZXNwYWNlLCBkZXNjTm9kZS5uYW1lKTtcbiAgICB9XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aChub2RlLCAnX2lkJywgZGVzY05vZGUuaWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19yZWYnLCBkZXNjTm9kZS5yZWYpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ190aWQnLCBkZXNjTm9kZS50aWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgobm9kZSwgJ19hdGlkJywgZGVzY05vZGUuYXRpZCk7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2lkJywgZGVzY05vZGUuaWQpO1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKCdfdGlkJywgZGVzY05vZGUudGlkKTtcbiAgICBub2RlLnNldEF0dHJpYnV0ZSgnX3JlZicsIGRlc2NOb2RlLnJlZik7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ19hdGlkJywgZGVzY05vZGUuYXRpZCk7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2V2ZW50cycsIEJ1aWxkRXZlbnQoZGVzY05vZGUuZXZlbnRzKSk7XG4gICAgZGVzY05vZGUuYXR0cnMuZm9yRWFjaChmdW5jdGlvbiBhdHRycyhhdHRyKSB7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dHIuS2V5LCBhdHRyLlZhbHVlKTtcbiAgICB9KTtcbiAgICBpZiAoZGVzY05vZGUucmVtb3ZlZCkge1xuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgnX3JlbW92ZWQnLCAndHJ1ZScpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93KSB7XG4gICAgICAgIGRlc2NOb2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGtpZEpTT04pIHtcbiAgICAgICAgICAgIGlmIChza2lwUmVtb3ZlZCAmJiBraWRKU09OLnJlbW92ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGpzb25NYWtlcihkb2MsIGtpZEpTT04sIHNoYWxsb3csIHNraXBSZW1vdmVkKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbn1cbmV4cG9ydHMuanNvbk1ha2VyID0ganNvbk1ha2VyO1xuZnVuY3Rpb24gQnVpbGRFdmVudChldmVudHMpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBuZXcgQXJyYXkoKTtcbiAgICBldmVudHMuZm9yRWFjaChmdW5jdGlvbiBhdHRycyhhdHRyKSB7XG4gICAgICAgIGNvbnN0IGV2ZW50TmFtZSA9IGF0dHIuTmFtZSArICctJyArIChhdHRyLlByZXZlbnREZWZhdWx0ID8gJzEnIDogJzAnKSArIChhdHRyLlN0b3BQcm9wYWdhdGlvbiA/ICcxJyA6ICcwJyk7XG4gICAgICAgIHZhbHVlcy5wdXNoKGV2ZW50TmFtZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbHVlcy5qb2luKCcgJyk7XG59XG5leHBvcnRzLkJ1aWxkRXZlbnQgPSBCdWlsZEV2ZW50O1xuZnVuY3Rpb24gSlNPTlBhdGNoVHJlZShmcmFnbWVudCwgbW91bnQsIGRpY3RhdG9yLCBtYWtlcikge1xuICAgIGxldCB0YXJnZXROb2RlID0gZmluZEVsZW1lbnQoZnJhZ21lbnQsIG1vdW50KTtcbiAgICBpZiAoZXh0cy5PYmplY3RzLmlzTnVsbE9yVW5kZWZpbmVkKHRhcmdldE5vZGUpKSB7XG4gICAgICAgIGNvbnN0IHROb2RlID0gbWFrZXIuTWFrZShkb2N1bWVudCwgZnJhZ21lbnQsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgbW91bnQuYXBwZW5kQ2hpbGQodGFyZ2V0Tm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgUGF0Y2hKU09OTm9kZShmcmFnbWVudCwgdGFyZ2V0Tm9kZSwgZGljdGF0b3IsIG1ha2VyKTtcbn1cbmV4cG9ydHMuSlNPTlBhdGNoVHJlZSA9IEpTT05QYXRjaFRyZWU7XG5mdW5jdGlvbiBQYXRjaEpTT05Ob2RlKGZyYWdtZW50LCB0YXJnZXROb2RlLCBkaWN0YXRvciwgbWFrZXIpIHtcbiAgICBpZiAoIWRpY3RhdG9yLlNhbWUodGFyZ2V0Tm9kZSwgZnJhZ21lbnQpKSB7XG4gICAgICAgIGNvbnN0IHROb2RlID0gbWFrZXIuTWFrZShkb2N1bWVudCwgZnJhZ21lbnQsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgZG9tLnJlcGxhY2VOb2RlKHRhcmdldE5vZGUucGFyZW50Tm9kZSwgdGFyZ2V0Tm9kZSwgdE5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghZGljdGF0b3IuQ2hhbmdlZCh0YXJnZXROb2RlLCBmcmFnbWVudCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBQYXRjaEpTT05BdHRyaWJ1dGVzKGZyYWdtZW50LCB0YXJnZXROb2RlKTtcbiAgICBjb25zdCB0b3RhbEtpZHMgPSB0YXJnZXROb2RlLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgIGNvbnN0IGZyYWdtZW50S2lkcyA9IGZyYWdtZW50LmNoaWxkcmVuLmxlbmd0aDtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yICg7IGkgPCB0b3RhbEtpZHM7IGkrKykge1xuICAgICAgICBjb25zdCBjaGlsZE5vZGUgPSB0YXJnZXROb2RlLmNoaWxkTm9kZXNbaV07XG4gICAgICAgIGlmIChpID49IGZyYWdtZW50S2lkcykge1xuICAgICAgICAgICAgY2hpbGROb2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hpbGRGcmFnbWVudCA9IGZyYWdtZW50LmNoaWxkcmVuW2ldO1xuICAgICAgICBQYXRjaEpTT05Ob2RlKGNoaWxkRnJhZ21lbnQsIGNoaWxkTm9kZSwgZGljdGF0b3IsIG1ha2VyKTtcbiAgICB9XG4gICAgZm9yICg7IGkgPCBmcmFnbWVudEtpZHM7IGkrKykge1xuICAgICAgICBjb25zdCB0Tm9kZSA9IG1ha2VyLk1ha2UoZG9jdW1lbnQsIGZyYWdtZW50LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIHRhcmdldE5vZGUuYXBwZW5kQ2hpbGQodE5vZGUpO1xuICAgIH1cbiAgICByZXR1cm47XG59XG5leHBvcnRzLlBhdGNoSlNPTk5vZGUgPSBQYXRjaEpTT05Ob2RlO1xuZnVuY3Rpb24gSlNPTkNoYW5nZXNQYXRjaChmcmFnbWVudCwgbW91bnQsIGRpY3RhdG9yLCBtYWtlcikge1xuICAgIGNvbnN0IGNoYW5nZXMgPSBmcmFnbWVudC5maWx0ZXIoZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuICFlbGVtLnJlbW92ZWQ7XG4gICAgfSk7XG4gICAgZnJhZ21lbnRcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBpZiAoIWVsZW0ucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBmaWx0ZXJlZCA9IHRydWU7XG4gICAgICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIGlmIChlbGVtLnRpZCA9PT0gZWwudGlkIHx8IGVsZW0udGlkID09IGVsLmF0aWQgfHwgZWxlbS5yZWYgPT09IGVsLnJlZikge1xuICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKHJlbW92YWwpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZmluZEVsZW1lbnQocmVtb3ZhbCwgbW91bnQpO1xuICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgICB0YXJnZXQucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24gKGNoYW5nZSkge1xuICAgICAgICBjb25zdCB0YXJnZXROb2RlID0gZmluZEVsZW1lbnQoY2hhbmdlLCBtb3VudCk7XG4gICAgICAgIGlmIChleHRzLk9iamVjdHMuaXNOdWxsT3JVbmRlZmluZWQodGFyZ2V0Tm9kZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVQYXJlbnQgPSBmaW5kRWxlbWVudFBhcmVudGJ5UmVmKGNoYW5nZS5yZWYsIG1vdW50KTtcbiAgICAgICAgICAgIGlmIChleHRzLk9iamVjdHMuaXNOdWxsT3JVbmRlZmluZWQodGFyZ2V0Tm9kZVBhcmVudCkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5hYmxlIHRvIGFwcGx5IG5ldyBjaGFuZ2Ugc3RyZWFtOiAnLCBjaGFuZ2UpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHROb2RlID0gbWFrZXIuTWFrZShkb2N1bWVudCwgY2hhbmdlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB0YXJnZXROb2RlUGFyZW50LmFwcGVuZENoaWxkKHROb2RlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBBcHBseUpTT05Ob2RlKGNoYW5nZSwgdGFyZ2V0Tm9kZSwgZGljdGF0b3IsIG1ha2VyKTtcbiAgICB9KTtcbiAgICByZXR1cm47XG59XG5leHBvcnRzLkpTT05DaGFuZ2VzUGF0Y2ggPSBKU09OQ2hhbmdlc1BhdGNoO1xuZnVuY3Rpb24gQXBwbHlKU09OTm9kZShmcmFnbWVudCwgdGFyZ2V0Tm9kZSwgZGljdGF0b3IsIG1ha2VyKSB7XG4gICAgaWYgKCFkaWN0YXRvci5TYW1lKHRhcmdldE5vZGUsIGZyYWdtZW50KSkge1xuICAgICAgICBjb25zdCB0Tm9kZSA9IG1ha2VyLk1ha2UoZG9jdW1lbnQsIGZyYWdtZW50LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIGRvbS5yZXBsYWNlTm9kZSh0YXJnZXROb2RlLnBhcmVudE5vZGUsIHRhcmdldE5vZGUsIHROb2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZGljdGF0b3IuQ2hhbmdlZCh0YXJnZXROb2RlLCBmcmFnbWVudCkpIHtcbiAgICAgICAgUGF0Y2hKU09OQXR0cmlidXRlcyhmcmFnbWVudCwgdGFyZ2V0Tm9kZSk7XG4gICAgfVxuICAgIGNvbnN0IHRvdGFsS2lkcyA9IHRhcmdldE5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7XG4gICAgY29uc3QgZnJhZ21lbnRLaWRzID0gZnJhZ21lbnQuY2hpbGRyZW4ubGVuZ3RoO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKDsgaSA8IHRvdGFsS2lkczsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoaWxkTm9kZSA9IHRhcmdldE5vZGUuY2hpbGROb2Rlc1tpXTtcbiAgICAgICAgaWYgKGkgPj0gZnJhZ21lbnRLaWRzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hpbGRGcmFnbWVudCA9IGZyYWdtZW50LmNoaWxkcmVuW2ldO1xuICAgICAgICBQYXRjaEpTT05Ob2RlKGNoaWxkRnJhZ21lbnQsIGNoaWxkTm9kZSwgZGljdGF0b3IsIG1ha2VyKTtcbiAgICB9XG4gICAgZm9yICg7IGkgPCBmcmFnbWVudEtpZHM7IGkrKykge1xuICAgICAgICBjb25zdCB0Tm9kZSA9IG1ha2VyLk1ha2UoZG9jdW1lbnQsIGZyYWdtZW50LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIHRhcmdldE5vZGUuYXBwZW5kQ2hpbGQodE5vZGUpO1xuICAgIH1cbiAgICByZXR1cm47XG59XG5leHBvcnRzLkFwcGx5SlNPTk5vZGUgPSBBcHBseUpTT05Ob2RlO1xuZnVuY3Rpb24gSlNPTlBhdGNoVGV4dENvbW1lbnRzKGZyYWdtZW50LCB0YXJnZXQpIHtcbiAgICBpZiAoZnJhZ21lbnQudHlwZSAhPT0gZG9tXzEuQ09NTUVOVF9OT0RFICYmIGZyYWdtZW50LnR5cGUgIT09IGRvbV8xLlRFWFRfTk9ERSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChmcmFnbWVudC50eXBlICE9PSBkb21fMS5DT01NRU5UX05PREUgJiYgZnJhZ21lbnQudHlwZSAhPT0gZG9tXzEuVEVYVF9OT0RFKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRhcmdldC50ZXh0Q29udGVudCA9PT0gZnJhZ21lbnQuY29udGVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRhcmdldC50ZXh0Q29udGVudCA9IGZyYWdtZW50LmNvbnRlbnQ7XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aCh0YXJnZXQsICdfcmVmJywgZnJhZ21lbnQucmVmKTtcbiAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKHRhcmdldCwgJ190aWQnLCBmcmFnbWVudC50aWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgodGFyZ2V0LCAnX2F0aWQnLCBmcmFnbWVudC5hdGlkKTtcbn1cbmV4cG9ydHMuSlNPTlBhdGNoVGV4dENvbW1lbnRzID0gSlNPTlBhdGNoVGV4dENvbW1lbnRzO1xuZnVuY3Rpb24gUGF0Y2hKU09OQXR0cmlidXRlcyhub2RlLCB0YXJnZXQpIHtcbiAgICBjb25zdCBvbGROb2RlQXR0cnMgPSBkb20ucmVjb3JkQXR0cmlidXRlcyh0YXJnZXQpO1xuICAgIG5vZGUuYXR0cnMuZm9yRWFjaChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9sZE5vZGVBdHRyc1thdHRyLktleV07XG4gICAgICAgIGRlbGV0ZSBvbGROb2RlQXR0cnNbYXR0ci5LZXldO1xuICAgICAgICBpZiAoYXR0ci5WYWx1ZSA9PT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoYXR0ci5LZXksIGF0dHIuVmFsdWUpO1xuICAgIH0pO1xuICAgIGZvciAobGV0IGluZGV4IGluIG9sZE5vZGVBdHRycykge1xuICAgICAgICB0YXJnZXQucmVtb3ZlQXR0cmlidXRlKGluZGV4KTtcbiAgICB9XG4gICAgdGFyZ2V0LnNldEF0dHJpYnV0ZSgnX3RpZCcsIG5vZGUudGlkKTtcbiAgICB0YXJnZXQuc2V0QXR0cmlidXRlKCdfcmVmJywgbm9kZS5yZWYpO1xuICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoJ19hdGlkJywgbm9kZS5hdGlkKTtcbiAgICB0YXJnZXQuc2V0QXR0cmlidXRlKCdldmVudHMnLCBCdWlsZEV2ZW50KG5vZGUuZXZlbnRzKSk7XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aCh0YXJnZXQsICdfaWQnLCBub2RlLmlkKTtcbiAgICBleHRzLk9iamVjdHMuUGF0Y2hXaXRoKHRhcmdldCwgJ19yZWYnLCBub2RlLnJlZik7XG4gICAgZXh0cy5PYmplY3RzLlBhdGNoV2l0aCh0YXJnZXQsICdfdGlkJywgbm9kZS50aWQpO1xuICAgIGV4dHMuT2JqZWN0cy5QYXRjaFdpdGgodGFyZ2V0LCAnX2F0aWQnLCBub2RlLmF0aWQpO1xufVxuZXhwb3J0cy5QYXRjaEpTT05BdHRyaWJ1dGVzID0gUGF0Y2hKU09OQXR0cmlidXRlcztcbmZ1bmN0aW9uIFBhdGNoVHJlZShuZXdGcmFnbWVudCwgb2xkTm9kZU9yTW91bnQsIGRpY3RhdG9yLCBpc0NoaWxkUmVjdXJzaW9uKSB7XG4gICAgaWYgKGlzQ2hpbGRSZWN1cnNpb24pIHtcbiAgICAgICAgY29uc3Qgcm9vdE5vZGUgPSBvbGROb2RlT3JNb3VudC5wYXJlbnROb2RlO1xuICAgICAgICBpZiAoIWRpY3RhdG9yLlNhbWUob2xkTm9kZU9yTW91bnQsIG5ld0ZyYWdtZW50KSkge1xuICAgICAgICAgICAgZG9tLnJlcGxhY2VOb2RlKHJvb3ROb2RlLCBvbGROb2RlT3JNb3VudCwgbmV3RnJhZ21lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvbGROb2RlT3JNb3VudC5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICAgICAgICAgIGRvbS5yZXBsYWNlTm9kZShyb290Tm9kZSwgb2xkTm9kZU9yTW91bnQsIG5ld0ZyYWdtZW50KTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvbnN0IG9sZENoaWxkcmVuID0gb2xkTm9kZU9yTW91bnQuY2hpbGROb2RlcztcbiAgICBjb25zdCBvbGRDaGlsZHJlbkxlbmd0aCA9IG9sZENoaWxkcmVuLmxlbmd0aDtcbiAgICBjb25zdCBuZXdDaGlsZHJlbiA9IG5ld0ZyYWdtZW50LmNoaWxkTm9kZXM7XG4gICAgY29uc3QgbmV3Q2hpbGRyZW5MZW5ndGggPSBuZXdDaGlsZHJlbi5sZW5ndGg7XG4gICAgY29uc3QgcmVtb3ZlT2xkTGVmdCA9IG5ld0NoaWxkcmVuTGVuZ3RoIDwgb2xkQ2hpbGRyZW5MZW5ndGg7XG4gICAgbGV0IGxhc3RJbmRleCA9IDA7XG4gICAgbGV0IGxhc3ROb2RlO1xuICAgIGxldCBsYXN0Tm9kZU5leHRTaWJsaW5nO1xuICAgIGxldCBuZXdOb2RlSGFuZGxlZDtcbiAgICBmb3IgKDsgbGFzdEluZGV4IDwgb2xkQ2hpbGRyZW5MZW5ndGg7IGxhc3RJbmRleCsrKSB7XG4gICAgICAgIGlmIChsYXN0SW5kZXggPj0gbmV3Q2hpbGRyZW5MZW5ndGgpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGxhc3ROb2RlID0gb2xkQ2hpbGRyZW5bbGFzdEluZGV4XTtcbiAgICAgICAgbmV3Tm9kZUhhbmRsZWQgPSBuZXdDaGlsZHJlbltsYXN0SW5kZXhdO1xuICAgICAgICBsYXN0Tm9kZU5leHRTaWJsaW5nID0gbGFzdE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIGlmICghZGljdGF0b3IuU2FtZShsYXN0Tm9kZSwgbmV3Tm9kZUhhbmRsZWQpKSB7XG4gICAgICAgICAgICBkb20ucmVwbGFjZU5vZGUob2xkTm9kZU9yTW91bnQsIGxhc3ROb2RlLCBuZXdOb2RlSGFuZGxlZCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRpY3RhdG9yLkNoYW5nZWQobGFzdE5vZGUsIG5ld05vZGVIYW5kbGVkKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxhc3ROb2RlLm5vZGVUeXBlID09PSBkb20uVEVYVF9OT0RFIHx8IGxhc3ROb2RlLm5vZGVUeXBlID09PSBkb20uQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICBpZiAobGFzdE5vZGUudGV4dENvbnRlbnQgIT09IG5ld05vZGVIYW5kbGVkLnRleHRDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgbGFzdE5vZGUudGV4dENvbnRlbnQgPSBuZXdOb2RlSGFuZGxlZC50ZXh0Q29udGVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbGFzdE5vZGUuaGFzQ2hpbGROb2RlcygpICYmIG5ld05vZGVIYW5kbGVkLmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgICAgICAgZG9tLnJlcGxhY2VOb2RlKG9sZE5vZGVPck1vdW50LCBsYXN0Tm9kZSwgbmV3Tm9kZUhhbmRsZWQpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxhc3ROb2RlLmhhc0NoaWxkTm9kZXMoKSAmJiAhbmV3Tm9kZUhhbmRsZWQuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICBkb20ucmVwbGFjZU5vZGUob2xkTm9kZU9yTW91bnQsIGxhc3ROb2RlLCBuZXdOb2RlSGFuZGxlZCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsYXN0RWxlbWVudCA9IGxhc3ROb2RlO1xuICAgICAgICBjb25zdCBuZXdFbGVtZW50ID0gbmV3Tm9kZUhhbmRsZWQ7XG4gICAgICAgIFBhdGNoQXR0cmlidXRlcyhuZXdFbGVtZW50LCBsYXN0RWxlbWVudCk7XG4gICAgICAgIGxhc3RFbGVtZW50LnNldEF0dHJpYnV0ZSgnX3BhdGNoZWQnLCAndHJ1ZScpO1xuICAgICAgICBQYXRjaFRyZWUobmV3RWxlbWVudCwgbGFzdEVsZW1lbnQsIGRpY3RhdG9yLCB0cnVlKTtcbiAgICAgICAgbGFzdEVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdfcGF0Y2hlZCcpO1xuICAgIH1cbiAgICBpZiAocmVtb3ZlT2xkTGVmdCAmJiBsYXN0Tm9kZU5leHRTaWJsaW5nICE9PSBudWxsKSB7XG4gICAgICAgIGRvbS5yZW1vdmVGcm9tTm9kZShsYXN0Tm9kZU5leHRTaWJsaW5nLCBudWxsKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAoOyBsYXN0SW5kZXggPCBuZXdDaGlsZHJlbkxlbmd0aDsgbGFzdEluZGV4KyspIHtcbiAgICAgICAgY29uc3QgbmV3Tm9kZSA9IG5ld0NoaWxkcmVuW2xhc3RJbmRleF07XG4gICAgICAgIG9sZE5vZGVPck1vdW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgIH1cbn1cbmV4cG9ydHMuUGF0Y2hUcmVlID0gUGF0Y2hUcmVlO1xuZnVuY3Rpb24gUGF0Y2hBdHRyaWJ1dGVzKG5ld0VsZW1lbnQsIG9sZEVsZW1lbnQpIHtcbiAgICBjb25zdCBvbGROb2RlQXR0cnMgPSBkb20ucmVjb3JkQXR0cmlidXRlcyhvbGRFbGVtZW50KTtcbiAgICBmb3IgKGxldCBpbmRleCBpbiBuZXdFbGVtZW50LmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc3QgYXR0ciA9IG5ld0VsZW1lbnQuYXR0cmlidXRlc1tpbmRleF07XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2xkTm9kZUF0dHJzW2F0dHIubmFtZV07XG4gICAgICAgIGRlbGV0ZSBvbGROb2RlQXR0cnNbYXR0ci5uYW1lXTtcbiAgICAgICAgaWYgKGF0dHIudmFsdWUgPT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBvbGRFbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgIH1cbiAgICBmb3IgKGxldCBpbmRleCBpbiBvbGROb2RlQXR0cnMpIHtcbiAgICAgICAgb2xkRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoaW5kZXgpO1xuICAgIH1cbn1cbmV4cG9ydHMuUGF0Y2hBdHRyaWJ1dGVzID0gUGF0Y2hBdHRyaWJ1dGVzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGF0Y2guanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBwcm9taXNlID0gcmVxdWlyZShcInByb21pc2UtcG9seWZpbGxcIik7XG5leHBvcnRzLlByb21pc2VBUEkgPSB7XG4gICAgUHJvbWlzZTogc2VsZi5Qcm9taXNlLFxufTtcbmlmICghc2VsZi5Qcm9taXNlKSB7XG4gICAgZXhwb3J0cy5Qcm9taXNlQVBJLlByb21pc2UgPSBwcm9taXNlO1xuICAgIHNlbGYuUHJvbWlzZSA9IHByb21pc2U7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wcm9taXNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3Qgbm93ID0gKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHBlcmZvcm1hbmNlLm5vdyB8fFxuICAgICAgICBwZXJmb3JtYW5jZS5tb3pOb3cgfHxcbiAgICAgICAgcGVyZm9ybWFuY2UubXNOb3cgfHxcbiAgICAgICAgcGVyZm9ybWFuY2Uub05vdyB8fFxuICAgICAgICBwZXJmb3JtYW5jZS53ZWJraXROb3cgfHxcbiAgICAgICAgRGF0ZS5ub3cpO1xufSkoKTtcbmNvbnN0IGZyYW1lUmF0ZSA9IDEwMDAgLyA2MDtcbmNvbnN0IHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xuZnVuY3Rpb24gR2V0UkFGKCkge1xuICAgIGxldCBsYXN0VGltZSA9IDA7XG4gICAgY29uc3QgbW9kID0ge307XG4gICAgZm9yICh2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XG4gICAgICAgIG1vZC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgICAgbW9kLmNhbmNlbEFuaW1hdGlvbkZyYW1lID1cbiAgICAgICAgICAgIHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gfHwgd2luZG93W3ZlbmRvcnNbeF0gKyAnUmVxdWVzdENhbmNlbEFuaW1hdGlvbkZyYW1lJ107XG4gICAgfVxuICAgIGlmICghbW9kLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhbW9kLmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICBtb2QucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBlbGVtZW50KSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyVGltZSA9IG5vdygpO1xuICAgICAgICAgICAgY29uc3QgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIGZyYW1lUmF0ZSAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcsIGUpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRpbWVUb0NhbGwpO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH07XG4gICAgaWYgKCFtb2QuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgICAgbW9kLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbW9kO1xufVxuZXhwb3J0cy5HZXRSQUYgPSBHZXRSQUY7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1yYWYtcG9seWZpbGwuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5mdW5jdGlvbiBsaW5lYXIodCkge1xuICAgIHJldHVybiB0O1xufVxuZXhwb3J0cy5saW5lYXIgPSBsaW5lYXI7XG5mdW5jdGlvbiBlYXNlSW5RdWFkKHQpIHtcbiAgICByZXR1cm4gdCAqIHQ7XG59XG5leHBvcnRzLmVhc2VJblF1YWQgPSBlYXNlSW5RdWFkO1xuZnVuY3Rpb24gZWFzZU91dFF1YWQodCkge1xuICAgIHJldHVybiB0ICogKDIgLSB0KTtcbn1cbmV4cG9ydHMuZWFzZU91dFF1YWQgPSBlYXNlT3V0UXVhZDtcbmZ1bmN0aW9uIGVhc2VJbk91dFF1YWQodCkge1xuICAgIHJldHVybiB0IDwgMC41ID8gMiAqIHQgKiB0IDogLTEgKyAoNCAtIDIgKiB0KSAqIHQ7XG59XG5leHBvcnRzLmVhc2VJbk91dFF1YWQgPSBlYXNlSW5PdXRRdWFkO1xuZnVuY3Rpb24gZWFzZUluQ3ViaWModCkge1xuICAgIHJldHVybiB0ICogdCAqIHQ7XG59XG5leHBvcnRzLmVhc2VJbkN1YmljID0gZWFzZUluQ3ViaWM7XG5mdW5jdGlvbiBlYXNlT3V0Q3ViaWModCkge1xuICAgIHJldHVybiAtLXQgKiB0ICogdCArIDE7XG59XG5leHBvcnRzLmVhc2VPdXRDdWJpYyA9IGVhc2VPdXRDdWJpYztcbmZ1bmN0aW9uIGVhc2VJbk91dEN1YmljKHQpIHtcbiAgICByZXR1cm4gdCA8IDAuNSA/IDQgKiB0ICogdCAqIHQgOiAodCAtIDEpICogKDIgKiB0IC0gMikgKiAoMiAqIHQgLSAyKSArIDE7XG59XG5leHBvcnRzLmVhc2VJbk91dEN1YmljID0gZWFzZUluT3V0Q3ViaWM7XG5mdW5jdGlvbiBlYXNlSW5RdWFydCh0KSB7XG4gICAgcmV0dXJuIHQgKiB0ICogdCAqIHQ7XG59XG5leHBvcnRzLmVhc2VJblF1YXJ0ID0gZWFzZUluUXVhcnQ7XG5mdW5jdGlvbiBlYXNlT3V0UXVhcnQodCkge1xuICAgIHJldHVybiAxIC0gLS10ICogdCAqIHQgKiB0O1xufVxuZXhwb3J0cy5lYXNlT3V0UXVhcnQgPSBlYXNlT3V0UXVhcnQ7XG5mdW5jdGlvbiBlYXNlSW5PdXRRdWFydCh0KSB7XG4gICAgcmV0dXJuIHQgPCAwLjUgPyA4ICogdCAqIHQgKiB0ICogdCA6IDEgLSA4ICogLS10ICogdCAqIHQgKiB0O1xufVxuZXhwb3J0cy5lYXNlSW5PdXRRdWFydCA9IGVhc2VJbk91dFF1YXJ0O1xuZnVuY3Rpb24gZWFzZUluUXVpbnQodCkge1xuICAgIHJldHVybiB0ICogdCAqIHQgKiB0ICogdDtcbn1cbmV4cG9ydHMuZWFzZUluUXVpbnQgPSBlYXNlSW5RdWludDtcbmZ1bmN0aW9uIGVhc2VPdXRRdWludCh0KSB7XG4gICAgcmV0dXJuIDEgKyAtLXQgKiB0ICogdCAqIHQgKiB0O1xufVxuZXhwb3J0cy5lYXNlT3V0UXVpbnQgPSBlYXNlT3V0UXVpbnQ7XG5mdW5jdGlvbiBlYXNlSW5PdXRRdWludCh0KSB7XG4gICAgcmV0dXJuIHQgPCAwLjUgPyAxNiAqIHQgKiB0ICogdCAqIHQgKiB0IDogMSArIDE2ICogLS10ICogdCAqIHQgKiB0ICogdDtcbn1cbmV4cG9ydHMuZWFzZUluT3V0UXVpbnQgPSBlYXNlSW5PdXRRdWludDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXR3ZWVuLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuZnVuY3Rpb24gQmxhbmsoKSB7IH1cbmV4cG9ydHMuQmxhbmsgPSBCbGFuaztcbkJsYW5rLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5mdW5jdGlvbiBoYXMobWFwLCBwcm9wZXJ0eSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG1hcCwgcHJvcGVydHkpO1xufVxuZXhwb3J0cy5oYXMgPSBoYXM7XG5mdW5jdGlvbiBjcmVhdGVNYXAoKSB7XG4gICAgcmV0dXJuIG5ldyBCbGFuaygpO1xufVxuZXhwb3J0cy5jcmVhdGVNYXAgPSBjcmVhdGVNYXA7XG5mdW5jdGlvbiB0cnVuY2F0ZUFycmF5KGFyciwgbGVuZ3RoKSB7XG4gICAgd2hpbGUgKGFyci5sZW5ndGggPiBsZW5ndGgpIHtcbiAgICAgICAgYXJyLnBvcCgpO1xuICAgIH1cbn1cbmV4cG9ydHMudHJ1bmNhdGVBcnJheSA9IHRydW5jYXRlQXJyYXk7XG5mdW5jdGlvbiBkZWNvZGVGb3JtQm9keShib2R5KSB7XG4gICAgbGV0IGZvcm0gPSBuZXcgRm9ybURhdGEoKTtcbiAgICBib2R5XG4gICAgICAgIC50cmltKClcbiAgICAgICAgLnNwbGl0KCcmJylcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGJ5dGVzKSB7XG4gICAgICAgIGlmIChieXRlcykge1xuICAgICAgICAgICAgbGV0IHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKTtcbiAgICAgICAgICAgIGxldCBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKTtcbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKTtcbiAgICAgICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZm9ybTtcbn1cbmV4cG9ydHMuZGVjb2RlRm9ybUJvZHkgPSBkZWNvZGVGb3JtQm9keTtcbmZ1bmN0aW9uIHBhcnNlSFRUUEhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIGxldCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKTtcbiAgICBsZXQgcHJlUHJvY2Vzc2VkSGVhZGVycyA9IHJhd0hlYWRlcnMucmVwbGFjZSgvXFxyP1xcbltcXHQgXSsvZywgJyAnKTtcbiAgICBwcmVQcm9jZXNzZWRIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgICBsZXQgcGFydHMgPSBsaW5lLnNwbGl0KCc6Jyk7XG4gICAgICAgIGxldCBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKTtcbiAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgbGV0IHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKTtcbiAgICAgICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5leHBvcnRzLnBhcnNlSFRUUEhlYWRlcnMgPSBwYXJzZUhUVFBIZWFkZXJzO1xuZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpO1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWxlUmVhZGVyUmVhZHkgPSBmaWxlUmVhZGVyUmVhZHk7XG5mdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIGxldCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIGxldCBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcik7XG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpO1xuICAgIHJldHVybiBwcm9taXNlO1xufVxuZXhwb3J0cy5yZWFkQmxvYkFzQXJyYXlCdWZmZXIgPSByZWFkQmxvYkFzQXJyYXlCdWZmZXI7XG5mdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgbGV0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgbGV0IHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKTtcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbmV4cG9ydHMucmVhZEJsb2JBc1RleHQgPSByZWFkQmxvYkFzVGV4dDtcbmZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICBsZXQgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zik7XG4gICAgbGV0IGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJyk7XG59XG5leHBvcnRzLnJlYWRBcnJheUJ1ZmZlckFzVGV4dCA9IHJlYWRBcnJheUJ1ZmZlckFzVGV4dDtcbmZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxldCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpO1xuICAgICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKTtcbiAgICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyO1xuICAgIH1cbn1cbmV4cG9ydHMuYnVmZmVyQ2xvbmUgPSBidWZmZXJDbG9uZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0aWxzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5PbmVTZWNvbmQgPSAxMDAwO1xuZXhwb3J0cy5PbmVNaW51dGUgPSBleHBvcnRzLk9uZVNlY29uZCAqIDYwO1xuY2xhc3MgU29ja2V0IHtcbiAgICBjb25zdHJ1Y3RvcihhZGRyLCByZWFkZXIsIGV4cG9uZW50LCBtYXhSZWNvbm5lY3RzLCBtYXhXYWl0KSB7XG4gICAgICAgIHRoaXMuYWRkciA9IGFkZHI7XG4gICAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5yZWFkZXIgPSByZWFkZXI7XG4gICAgICAgIHRoaXMubWF4V2FpdCA9IG1heFdhaXQ7XG4gICAgICAgIHRoaXMudXNlckNsb3NlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmV4cG9uZW50ID0gZXhwb25lbnQ7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYXR0ZW1wdGVkQ29ubmVjdHMgPSAwO1xuICAgICAgICB0aGlzLmxhc3RXYWl0ID0gZXhwb3J0cy5PbmVTZWNvbmQ7XG4gICAgICAgIHRoaXMubWF4UmVjb25uZWN0ID0gbWF4UmVjb25uZWN0cztcbiAgICAgICAgdGhpcy53cml0ZUJ1ZmZlciA9IG5ldyBBcnJheSgpO1xuICAgIH1cbiAgICBjb25uZWN0KCkge1xuICAgICAgICBpZiAodGhpcy5zb2NrZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5hdHRlbXB0ZWRDb25uZWN0cyA+PSB0aGlzLm1heFJlY29ubmVjdCkge1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIuRXhoYXVzdGVkKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNvY2tldCA9IG5ldyBXZWJTb2NrZXQodGhpcy5hZGRyKTtcbiAgICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCB0aGlzLl9vcGVuZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMuX2Vycm9yZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5fbWVzc2FnZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIHRoaXMuX2Rpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHNlbmQobWVzc2FnZSkge1xuICAgICAgICBpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMud3JpdGVCdWZmZXIucHVzaChtZXNzYWdlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNvY2tldC5zZW5kKG1lc3NhZ2UpO1xuICAgIH1cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy5hdHRlbXB0ZWRDb25uZWN0cyA9IDA7XG4gICAgICAgIHRoaXMubGFzdFdhaXQgPSBleHBvcnRzLk9uZVNlY29uZDtcbiAgICB9XG4gICAgZW5kKCkge1xuICAgICAgICB0aGlzLnVzZXJDbG9zZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlYWRlci5DbG9zZWQodGhpcyk7XG4gICAgICAgIHRoaXMuc29ja2V0LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICB9XG4gICAgX2Rpc2Nvbm5lY3RlZChldmVudCkge1xuICAgICAgICB0aGlzLnJlYWRlci5EaXNjb25uZWN0ZWQoZXZlbnQsIHRoaXMpO1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMudXNlckNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXh0V2FpdCA9IHRoaXMubGFzdFdhaXQ7XG4gICAgICAgIGlmICh0aGlzLmV4cG9uZW50KSB7XG4gICAgICAgICAgICBuZXh0V2FpdCA9IHRoaXMuZXhwb25lbnQobmV4dFdhaXQpO1xuICAgICAgICAgICAgaWYgKG5leHRXYWl0ID4gdGhpcy5tYXhXYWl0KSB7XG4gICAgICAgICAgICAgICAgbmV4dFdhaXQgPSB0aGlzLm1heFdhaXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCh0aGlzLmNvbm5lY3QuYmluZCh0aGlzKSwgbmV4dFdhaXQpO1xuICAgICAgICB0aGlzLmF0dGVtcHRlZENvbm5lY3RzKys7XG4gICAgfVxuICAgIF9vcGVuZWQoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5yZWFkZXIuQ29ubmVjdGVkKGV2ZW50LCB0aGlzKTtcbiAgICAgICAgd2hpbGUgKHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMud3JpdGVCdWZmZXIuc2hpZnQoKTtcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LnNlbmQobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Vycm9yZWQoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5yZWFkZXIuRXJyb3JlZChldmVudCwgdGhpcyk7XG4gICAgfVxuICAgIF9tZXNzYWdlZChldmVudCkge1xuICAgICAgICB0aGlzLnJlYWRlci5NZXNzYWdlKGV2ZW50LCB0aGlzKTtcbiAgICB9XG59XG5leHBvcnRzLlNvY2tldCA9IFNvY2tldDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXdlYnNvY2tldC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IHJhZiA9IHJlcXVpcmUoXCIuL3JhZi1wb2x5ZmlsbFwiKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG5jb25zdCBleHRzID0gcmVxdWlyZShcIi4vZXh0ZW5zaW9uc1wiKTtcbmNvbnN0IGFuaW1lID0gcmVxdWlyZShcIi4vYW5pbWVcIik7XG5jb25zdCBwYXRjaCA9IHJlcXVpcmUoXCIuL3BhdGNoXCIpO1xuY29uc3QgbW91bnQgPSByZXF1aXJlKFwiLi9tb3VudFwiKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoXCIuL2RvbVwiKTtcbmNvbnN0IHdzID0gcmVxdWlyZShcIi4vd2Vic29ja2V0XCIpO1xuY29uc3QgaHR0cCA9IHJlcXVpcmUoXCIuL2h0dHBcIik7XG5jb25zdCB0d2VlbmVkID0gcmVxdWlyZShcIi4vdHdlZW5cIik7XG5jb25zdCBpbnRlciA9IHJlcXVpcmUoXCIuL2ludGVycG9sYXRpb25zXCIpO1xuY29uc3QgZmV0Y2hfMSA9IHJlcXVpcmUoXCIuL2ZldGNoXCIpO1xuY29uc3QgcHJvbWlzZV8xID0gcmVxdWlyZShcIi4vcHJvbWlzZVwiKTtcbmV4cG9ydHMuV2ViVk0gPSB7XG4gICAgZG9tOiBkb20sXG4gICAgcmFmOiByYWYsXG4gICAgaHR0cDogaHR0cCxcbiAgICBtb3VudDogbW91bnQsXG4gICAgcGF0Y2g6IHBhdGNoLFxuICAgIHV0aWxzOiB1dGlscyxcbiAgICB3ZWJzb2NrZXQ6IHdzLFxuICAgIGZldGNoOiBmZXRjaF8xLmZldGNoQVBJLFxuICAgIGV4dGVuc2lvbnM6IGV4dHMsXG4gICAgcHJvbWlzZTogcHJvbWlzZV8xLlByb21pc2VBUEkuUHJvbWlzZSxcbiAgICB2Zng6IHtcbiAgICAgICAgdHdlZW46IHR3ZWVuZWQsXG4gICAgICAgIGFuaW1hdGlvbnM6IGFuaW1lLFxuICAgICAgICBpbnRlcnBvbGF0aW9uczogaW50ZXIsXG4gICAgfSxcbn07XG5zZWxmLldlYlZNID0gZXhwb3J0cy5XZWJWTTtcbmV4cG9ydHMuZGVmYXVsdCA9IGV4cG9ydHMuV2ViVk07XG4vLyMgc291cmNlTWFwcGluZ1VSTD13ZWJ2bS5qcy5tYXAiXX0=
