"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch = require("whatwg-fetch");
exports.fetchAPI = {
    fetch: self.fetch,
    Headers: self.Headers,
    Request: self.Request,
    Response: self.Response,
    DOMException: self.DOMException,
};
if (!self.fetch) {
    exports.fetchAPI.fetch = fetch.fetch;
    exports.fetchAPI.Headers = fetch.Headers;
    exports.fetchAPI.Request = fetch.Request;
    exports.fetchAPI.Response = fetch.Response;
    exports.fetchAPI.DOMException = fetch.DOMException;
    self.fetch = fetch.fetch;
    self.Headers = fetch.Headers;
    self.Request = fetch.Request;
    self.Response = fetch.Response;
    self.DOMException = fetch.DOMException;
}
//# sourceMappingURL=fetch.js.map