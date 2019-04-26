"use strict";
const raf = require("./raf-polyfill");
const utils = require("./utils");
const exts = require("./extensions");
const anime = require("./anime");
const patch = require("./patch");
const mount = require("./mount");
const dom = require("./dom");
module.exports = {
    dom: dom,
    raf: raf,
    mount: mount,
    patch: patch,
    utils: utils,
    extensions: exts,
    animation: anime,
};
//# sourceMappingURL=webvm.js.map