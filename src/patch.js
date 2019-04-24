"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dom = require("./dom");
exports.DefaultNodeDictator = {
    Same: (n, m) => {
        return n.nodeType == m.nodeType && n.nodeName == m.nodeName;
    },
    Changed: (n, m) => {
        return false;
    },
};
exports.DefaultJSONDictator = {
    Same: (n, m) => {
        return false;
    },
    Changed: (n, m) => {
        return false;
    },
};
exports.DefaultJSONMaker = {
    Make: (doc, descNode, staticRoot) => {
        let node;
        if (descNode.namespace.length != 0) {
            node = doc.createElement(descNode.name);
        }
        else {
            node = doc.createElementNS(descNode.namespace, descNode.name);
        }
        return node;
    },
};
function PatchTreeByJSON(newFragment, oldFragment, dictator, maker) {
}
exports.PatchTreeByJSON = PatchTreeByJSON;
function PatchTree(newFragment, oldFragment, dictator) {
    const rootNode = oldFragment.parentNode;
    if (!dictator.Same(oldFragment, newFragment)) {
        dom.replaceNode(rootNode, oldFragment, newFragment);
        return null;
    }
    if (!oldFragment.hasChildNodes()) {
        dom.replaceNode(rootNode, oldFragment, newFragment);
        return null;
    }
    const oldChildren = oldFragment.childNodes;
    const oldChildrenLength = oldChildren.length;
    const newChildren = newFragment.childNodes;
    const newChildrenLength = newChildren.length;
    const removeOldLeft = (newChildrenLength < oldChildrenLength);
    let lastIndex = 0;
    let lastNode;
    let lastNodeNextSibling;
    let newNodeHandled;
    for (; lastIndex < oldChildrenLength; lastIndex++) {
        if (lastIndex >= newChildrenLength) {
            break;
        }
        lastNode = oldChildren[lastIndex];
        newNodeHandled = newChildren[lastIndex];
        lastNodeNextSibling = lastNode.nextSibling;
        if (!dictator.Same(lastNode, newNodeHandled)) {
            dom.replaceNode(oldFragment, lastNode, newNodeHandled);
            continue;
        }
        if (!dictator.Changed(lastNode, newNodeHandled)) {
            continue;
        }
        if (lastNode.nodeType == dom.TEXT_NODE || lastNode.nodeType == dom.COMMENT_NODE) {
            if (lastNode.textContent != newNodeHandled.textContent) {
                lastNode.textContent = newNodeHandled.textContent;
            }
            continue;
        }
        if (!lastNode.hasChildNodes() && newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldFragment, lastNode, newNodeHandled);
            continue;
        }
        if (lastNode.hasChildNodes() && !newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldFragment, lastNode, newNodeHandled);
            continue;
        }
        const lastElement = lastNode;
        const newElement = newNodeHandled;
        PatchAttributes(newElement, lastElement);
        lastElement.setAttribute("_patched", "true");
        PatchTree(newElement, lastElement, dictator);
        lastElement.removeAttribute("_patched");
    }
    if (removeOldLeft && lastNodeNextSibling !== null) {
        dom.removeFromNode(lastNodeNextSibling, null);
        return null;
    }
    for (; lastIndex < newChildrenLength; lastIndex++) {
        const newNode = newChildren[lastIndex];
        oldFragment.appendChild(newNode);
    }
}
exports.PatchTree = PatchTree;
function PatchAttributes(newElement, oldElement) {
    const oldNodeAttrs = dom.recordAttributes(oldElement);
    for (let index in newElement.attributes) {
        const attr = newElement.attributes[index];
        const oldValue = oldNodeAttrs[attr.name];
        delete oldNodeAttrs[attr.name];
        if (attr.value == oldValue) {
            continue;
        }
        oldElement.setAttribute(attr.name, attr.value);
    }
    for (let index in oldNodeAttrs) {
        oldElement.removeAttribute(index);
    }
}
exports.PatchAttributes = PatchAttributes;
//# sourceMappingURL=patch.js.map