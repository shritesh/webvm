"use strict";
(function () {
    var now = (function () {
        return performance.now ||
            performance.mozNow ||
            performance.msNow ||
            performance.oNow ||
            performance.webkitNow ||
            Date.now;
    })();
    var lastTime = 0;
    var frameRate = 1000 / 60;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
            || window[vendors[x] + 'RequestCancelAnimationFrame'];
    }
    if (!window.requestAnimationFrame || !window.cancelAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = now();
            var timeToCall = Math.max(0, frameRate - (currTime - lastTime));
            var id = window.setTimeout(function () {
                try {
                    callback(currTime + timeToCall);
                }
                catch (e) {
                    console.log("Error: ", e);
                    setTimeout(function () {
                        throw e;
                    }, 0);
                }
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());
//# sourceMappingURL=raf-polyfill.js.map