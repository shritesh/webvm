"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
/* DOMMount exists to provide a focus DOM operation on a giving underline static node,
*  which will be used for mounting an ever updating series of changes, nodes and html elements.
* It acts as the bridge for event management, propagation and update, just like in react, the mount
* node will be where your components are rendered.
*
* Static node means a DOM node never to be removed, changed by other scripts, it was added by
* html text within original html file)
*
*/
var DOMMount = /** @class */ (function () {
    function DOMMount(document, target) {
        this.doc = document;
        // if it's a string, then attempt using of document.querySelector
        if (_.isString(target)) {
            var targetSelector = target;
            var node = this.doc.querySelector(targetSelector);
            if (node === null || node === undefined) {
                throw new Error("unable to locate node for " + { targetSelector: targetSelector });
            }
            this.mountNode = node;
            return;
        }
        this.mountNode = target;
    }
    return DOMMount;
}());
exports.DOMMount = DOMMount;
