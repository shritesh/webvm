"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function linear(t) { return t; }
exports.linear = linear;
function easeInQuad(t) { return t * t; }
exports.easeInQuad = easeInQuad;
function easeOutQuad(t) { return t * (2 - t); }
exports.easeOutQuad = easeOutQuad;
function easeInOutQuad(t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
exports.easeInOutQuad = easeInOutQuad;
function easeInCubic(t) { return t * t * t; }
exports.easeInCubic = easeInCubic;
function easeOutCubic(t) { return (--t) * t * t + 1; }
exports.easeOutCubic = easeOutCubic;
function easeInOutCubic(t) { return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; }
exports.easeInOutCubic = easeInOutCubic;
function easeInQuart(t) { return t * t * t * t; }
exports.easeInQuart = easeInQuart;
function easeOutQuart(t) { return 1 - (--t) * t * t * t; }
exports.easeOutQuart = easeOutQuart;
function easeInOutQuart(t) { return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t; }
exports.easeInOutQuart = easeInOutQuart;
function easeInQuint(t) { return t * t * t * t * t; }
exports.easeInQuint = easeInQuint;
function easeOutQuint(t) { return 1 + (--t) * t * t * t * t; }
exports.easeOutQuint = easeOutQuint;
function easeInOutQuint(t) { return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t; }
exports.easeInOutQuint = easeInOutQuint;
//# sourceMappingURL=tween.js.map