"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dom = require("./dom");
const patch = require("./patch");
class DOMMount {
    constructor(document, target, notifier) {
        this.doc = document;
        this.notifier = notifier;
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
    handleEvent(event) {
        if (!this.events[event.type]) {
            return;
        }
        event.stopPropagation();
        const target = event.target;
        if (target.nodeType !== dom.ELEMENT_NODE) {
            return;
        }
        const targetElement = target;
        if (!targetElement.hasAttribute("events")) {
            return;
        }
        const events = targetElement.getAttribute("events");
        const filtered = events.split(" ").filter(function (item) {
            return item.startsWith(event.type);
        });
        if (filtered.length === 0) {
            return;
        }
        this.notifier(event, targetElement);
    }
    patch(change) {
        this.patchWith(change, patch.DefaultNodeDictator, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
    }
    patchWith(change, nodeDictator, jsonDictator, jsonMaker) {
        if (change instanceof DocumentFragment) {
            const fragment = change;
            patch.PatchDOMTree(fragment, this.mountNode, nodeDictator, false);
            this.registerNodeEvents(fragment);
            return;
        }
        if (typeof change === 'string') {
            const node = document.createElement('div');
            node.innerHTML = change;
            patch.PatchDOMTree(node, this.mountNode, nodeDictator, false);
            this.registerNodeEvents(node);
            return;
        }
        if (!patch.isJSONNode(change)) {
            return;
        }
        const node = change;
        patch.PatchJSONNodeTree(node, this.mountNode, jsonDictator, jsonMaker);
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
        this.streamListWith(changes, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
    }
    streamListWith(changes, dictator, maker) {
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
            if (events) {
                events.split(' ').forEach(function (desc) {
                    const eventName = desc.substr(0, desc.length - 3);
                    binder.registerEvent(eventName);
                    switch (desc.substr(desc.length - 2, desc.length)) {
                        case "01":
                            break;
                        case "10":
                            n.addEventListener(eventName, DOMMount.preventDefault, false);
                            break;
                        case "11":
                            n.addEventListener(eventName, DOMMount.preventDefault, false);
                            break;
                    }
                });
            }
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
    textContent() {
        return this.mountNode.textContent;
    }
    innerHTML() {
        return this.mountNode.innerHTML;
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
    static preventDefault(event) {
        event.preventDefault();
    }
    static stopPropagation(event) {
        event.stopPropagation();
    }
}
exports.DOMMount = DOMMount;
//# sourceMappingURL=mount.js.map