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
const tweens = require("./tween");
const inter = require("./interpolations");
const fetch = require("whatwg-fetch");
const promise = require("promise-polyfill");
exports.default = {
    dom: dom,
    raf: raf,
    fetch: fetch,
    mount: mount,
    patch: patch,
    utils: utils,
    websocket: ws,
    extensions: exts,
    promise: promise,
    vfx: {
        tween: tweens,
        animations: anime,
        interpolations: inter,
    },
};
//# sourceMappingURL=webvm.js.map