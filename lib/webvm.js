"use strict";
var raf = require("./raf-polyfill");
var utils = require("./utils");
var exts = require("./extensions");
var anime = require("./anime");
var patch = require("./patch");
var mount = require("./mount");
var dom = require("./dom");
module.exports = {
    dom: dom,
    raf: raf,
    mount: mount,
    patch: patch,
    utils: utils,
    extensions: exts,
    animation: anime,
};
