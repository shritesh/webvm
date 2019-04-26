"use strict";
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
Object.defineProperty(exports, "__esModule", { value: true });
var now = (function () {
    return performance.now ||
        // @ts-ignore
        performance.mozNow ||
        // @ts-ignore
        performance.msNow ||
        // @ts-ignore
        performance.oNow ||
        // @ts-ignore
        performance.webkitNow ||
        Date.now;
})();
var frameRate = 1000 / 60;
var vendors = ['ms', 'moz', 'webkit', 'o'];
function GetRAF() {
    var lastTime = 0;
    var mod = {};
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        mod.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        mod.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
            || window[vendors[x] + 'RequestCancelAnimationFrame'];
    }
    if (!mod.requestAnimationFrame || !mod.cancelAnimationFrame) //current Chrome (16) supports request but not cancel
        mod.requestAnimationFrame = function (callback, element) {
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
    if (!mod.cancelAnimationFrame) {
        mod.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
    return mod;
}
exports.GetRAF = GetRAF;
