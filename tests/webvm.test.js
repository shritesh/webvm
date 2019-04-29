"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mount = require("../lib/mount");
describe("WebVM unit tests", function () {
    it("Should be able to create a DOMMount for a dom node", function () {
        // Set up our document body
        document.body.innerHTML = "<div id='app'></div>";
        var app = document.querySelector('div#app');
        var mounted = new mount.DOMMount(document, '#app', function (event, target) {
        });
        expect(mounted).toBeDefined();
        expect(mounted.doc).toBeDefined();
        expect(mounted.doc).toBe(document);
        expect(mounted.mountNode).toBeDefined();
        expect(mounted.mountNode).toBe(app);
        var newContent = "\n\t\t\t<div id=\"rack-table\">\n\t\t\t\t<div id=\"rack-item-1\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t\t<div id=\"rack-item-2\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t\t<div id=\"rack-item-3\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t\t<div id=\"rack-item-4\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t";
        mounted.patch(newContent);
        expect(mounted.innerHTML()).toBe(newContent);
        var newContent2 = "\n\t\t\t<div id=\"rack-table\">\n\t\t\t\t<div id=\"rack-item-2\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t\t<div id=\"rack-item-3\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t\t<div id=\"rack-item-1\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t\t<div id=\"rack-item-4\">\n\t\t\t\t\t\t<span>Wrecker</span>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t";
        mounted.patch(newContent2);
        expect(mounted.innerHTML()).toBe(newContent2);
        // expect(mounted.innerHTML()).not.toBe(newContent);
    });
});
