"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raf = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || function (cb) { return setTimeout(cb, 16); };
class AnimationQueue {
    constructor() {
        this.frames = new Array();
    }
    new() {
        const newFrame = new AFrame(this.frames.length, this);
        this.frames.push(newFrame);
        return newFrame;
    }
    remove(f) {
        if (this.frames.length == 0) {
            return null;
        }
        const total = this.frames.length;
        if (total == 1) {
            this.frames.pop();
            return null;
        }
        this.frames[f.queueIndex] = this.frames[total - 1];
        this.frames.length = total - 1;
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
    pause() {
        this.skip = true;
    }
    stop() {
        this.pause();
        this.queue.remove(this);
    }
    animate(ts) {
        for (let index in this.callbacks) {
            const callback = this.callbacks[index];
            callback(ts);
        }
    }
}
exports.AFrame = AFrame;
//# sourceMappingURL=anime.js.map