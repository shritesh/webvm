"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mount = require("../lib/mount");
describe("WebVM unit tests", function () {
    it("Should be able to create a DOMMount for a dom node", function () {
        // Set up our document body
        document.body.innerHTML =
            '<div>' +
                '  <span id="username" />' +
                '  <button id="button" />' +
                '</div>';
        var elem = new mount.DOMMount(document, '#username');
        expect(elem).toBeDefined();
        expect(elem.mountNode).toBeDefined();
        expect(elem.doc).toBeDefined();
        expect(elem.doc).toBe(document);
        expect(elem.mountNode).toBe(document.querySelector('span#username'));
    });
});
