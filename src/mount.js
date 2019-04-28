"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patch = require("./patch");
const dom = require("./dom");
class DOMMount {
    constructor(document, target) {
        this.doc = document;
        this.events = {};
        this.handler = this.handleEvent.bind(this);
        if (typeof target === 'string') {
            const targetSelector = target;
            const node = this.doc.querySelector(targetSelector);
            if (node === null || node === undefined) {
                throw new Error(`unable to locate node for ${{ targetSelector }}`);
            }
            this.mountNode = node;
            return;
        }
        this.mountNode = target;
    }
    handleEvent(event) { }
    patch(change) {
        if (change instanceof DocumentFragment) {
            const fragment = change;
            patch.PatchDOMTree(fragment, this.mountNode, patch.DefaultNodeDictator, false);
            this.registerNodeEvents(fragment);
            return;
        }
        if (typeof change === 'string') {
            const node = document.createElement('div');
            node.innerHTML = change;
            patch.PatchDOMTree(node, this.mountNode, patch.DefaultNodeDictator, false);
            this.registerNodeEvents(node);
            return;
        }
        if (!patch.isJSONNode(change)) {
            return;
        }
        const node = change;
        patch.PatchJSONNodeTree(node, this.mountNode, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
        this.registerJSONNodeEvents(node);
    }
    patchList(changes) {
        changes.forEach(this.patch.bind(this));
    }
    stream(changes) {
        const nodes = JSON.parse(changes);
        return this.streamList(nodes);
    }
    streamList(changes) {
        patch.StreamJSONNodes(changes, this.mountNode, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
        changes.forEach(this.registerJSONNodeEvents.bind(this));
    }
    registerNodeEvents(node) {
        const binder = this;
        dom.applyEachNode(node, function (n) {
            if (n.nodeType !== dom.ELEMENT_NODE) {
                return;
            }
            const elem = node;
            const events = elem.getAttribute('events');
            events.split(' ').forEach(function (desc) {
                const order = desc.split('-');
                if (order.length === 2) {
                    binder.registerEvent(order[0]);
                }
            });
        });
    }
    registerJSONNodeEvents(node) {
        const binder = this;
        patch.applyJSONNodeFunction(node, function (n) {
            if (n.removed) {
                n.events.forEach(function (desc) {
                    binder.unregisterEvent(desc.Name);
                });
                return;
            }
            n.events.forEach(function (desc) {
                binder.registerEvent(desc.Name);
            });
        });
    }
    registerEvent(eventName) {
        if (this.events[eventName]) {
            return;
        }
        this.mountNode.addEventListener(eventName, this.handler, true);
        this.events[eventName] = true;
    }
    unregisterEvent(eventName) {
        if (!this.events[eventName]) {
            return;
        }
        this.mountNode.removeEventListener(eventName, this.handler, true);
        this.events[eventName] = false;
    }
}
exports.DOMMount = DOMMount;
//# sourceMappingURL=mount.js.map