"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const now = (function () {
    return performance.now ||
        performance.mozNow ||
        performance.msNow ||
        performance.oNow ||
        performance.webkitNow ||
        Date.now;
})();
const frameRate = 1000 / 60;
const vendors = ['ms', 'moz', 'webkit', 'o'];
function GetRAF() {
    let lastTime = 0;
    const mod = {};
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        mod.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        mod.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
            || window[vendors[x] + 'RequestCancelAnimationFrame'];
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
                    console.log("Error: ", e);
                    setTimeout(function () {
                        throw e;
                    }, 0);
                }
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if (!window.cancelAnimationFrame) {
        mod.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
    return mod;
}
exports.GetRAF = GetRAF;
//# sourceMappingURL=raf-polyfill.js.map