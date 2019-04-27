"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promise = require("promise-polyfill");
exports.PromiseAPI = {
    Promise: self.Promise,
};
if (!self.Promise) {
    exports.PromiseAPI.Promise = promise;
    self.Promise = promise;
}
//# sourceMappingURL=promise.js.map