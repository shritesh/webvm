"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rafPolyfill = require("./raf-polyfill");
// AnimationQueue provides a queuing mechanism to create sectioned animations where
// one queue represent a set of an animation sequence or frames. This frames have no
// correlation with a Frame in animation but rather the idea of a frame of callbacks
// that may be connected together, basically a callback set. The idea is the queue
// sits on top of RequestAnimationFrame sequencing a set of Frames who control a set
// of callbacks.
//
// Start -> AnimationQueue.bind
// Stop -> AnimationQueue.unbind.
//
var AnimationQueue = /** @class */ (function () {
    function AnimationQueue() {
        this.skip = false;
        this.binded = false;
        this.requestAnimationID = -1;
        this.frames = new Array();
        this.bindCycle = this.cycle.bind(this);
        this.rafProvider = rafPolyfill.GetRAF();
    }
    // new returns a new Frame from queue.
    AnimationQueue.prototype.new = function () {
        var newFrame = new AFrame(this.frames.length, this);
        this.frames.push(newFrame);
        return newFrame;
    };
    // Add adds provided frame into queue.
    AnimationQueue.prototype.add = function (f) {
        f.queueIndex = this.frames.length;
        f.queue = this;
        this.frames.push(f);
    };
    AnimationQueue.prototype.resume = function () {
        this.skip = false;
    };
    AnimationQueue.prototype.pause = function () {
        this.skip = true;
    };
    // unbind unbinds the giving queue from request animation frame.
    AnimationQueue.prototype.unbind = function () {
        if (!this.binded) {
            return null;
        }
        this.rafProvider.cancelAnimationFrame(this.requestAnimationID);
    };
    AnimationQueue.prototype.bind = function () {
        if (this.binded)
            return null;
        this.requestAnimationID = this.rafProvider.requestAnimationFrame(this.bindCycle, null);
        this.binded = true;
    };
    AnimationQueue.prototype.cycle = function (ms) {
        if (this.frames.length === 0) {
            this.binded = false;
            return;
        }
        // animate all frames connected with this queue.
        this.frames.forEach(function (f) {
            if (!f.paused()) {
                f.animate(ms);
            }
        });
        this.bind();
    };
    return AnimationQueue;
}());
exports.AnimationQueue = AnimationQueue;
// AFrame provides sets of callbacks sets which will be executed at the same time
// by the underline queue.
var AFrame = /** @class */ (function () {
    function AFrame(index, queue) {
        this.skip = false;
        this.queue = queue;
        this.queueIndex = index;
        this.callbacks = new Array();
    }
    // Add adds new callback into giving frame callback group.
    AFrame.prototype.add = function (callback) {
        this.callbacks.push(callback);
    };
    // Clear clears all items from underline callback.
    AFrame.prototype.clear = function () {
        this.callbacks.length = 0;
    };
    // Paused returns true/false if giving frame is paused.
    AFrame.prototype.paused = function () {
        return this.skip;
    };
    // Pause pauses giving frame.
    AFrame.prototype.pause = function () {
        this.skip = true;
    };
    // stop removes giving frame from it's underline queue.
    AFrame.prototype.stop = function () {
        this.pause();
        if (this.queueIndex === -1) {
            return null;
        }
        if (this.queue.frames.length == 0) {
            this.queue = undefined;
            this.queueIndex = -1;
            return null;
        }
        var total = this.queue.frames.length;
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
    };
    AFrame.prototype.animate = function (ts) {
        for (var index in this.callbacks) {
            var callback = this.callbacks[index];
            callback(ts);
        }
    };
    return AFrame;
}());
exports.AFrame = AFrame;
