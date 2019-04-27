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
exports.default = {
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
//# sourceMappingURL=webvm.js.map