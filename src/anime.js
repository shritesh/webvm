"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AnimationQueue {
    constructor() {
        this.skip = false;
        this.binded = false;
        this.requestAnimationID = -1;
        this.frames = new Array();
    }
    new() {
        const newFrame = new AFrame(this.frames.length, this);
        this.frames.push(newFrame);
        return newFrame;
    }
    add(f) {
        f.queueIndex = this.frames.length;
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
        window.cancelAnimationFrame(this.requestAnimationID);
    }
    bind() {
        if (this.binded)
            return null;
        const bindCycle = this.cycle.bind(this);
        this.requestAnimationID = window.requestAnimationFrame(bindCycle);
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
    paused() {
        return this.skip;
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