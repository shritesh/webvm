"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const exts = require("./extensions");
exports.ELEMENT_NODE = 1;
exports.DOCUMENT_FRAGMENT_NODE = 11;
exports.DOCUMENT_NODE = 9;
exports.TEXT_NODE = 3;
exports.COMMENT_NODE = 8;
const attributes = utils_1.createMap();
attributes['style'] = applyStyle;
function isDocumentRoot(node) {
    return node.nodeType === 11 || node.nodeType === 9;
}
exports.isDocumentRoot = isDocumentRoot;
function isElement(node) {
    return node.nodeType === 1;
}
exports.isElement = isElement;
function isText(node) {
    return node.nodeType === 3;
}
exports.isText = isText;
function getAncestry(node, root) {
    const ancestry = [];
    let cur = node;
    while (cur !== root) {
        const n = cur;
        ancestry.push(n);
        cur = n.parentNode;
    }
    return ancestry;
}
exports.getAncestry = getAncestry;
const getRootNode = Node.prototype.getRootNode ||
    function () {
        let cur = this;
        let prev = cur;
        while (cur) {
            prev = cur;
            cur = cur.parentNode;
        }
        return prev;
    };
function reverseCollectNodeWithBreadth(parent, matcher, matches) {
    let cur = parent.lastChild;
    while (cur) {
        if (matcher(cur)) {
            matches.push(cur);
        }
        cur = cur.previousSibling;
    }
}
exports.reverseCollectNodeWithBreadth = reverseCollectNodeWithBreadth;
function reverseFindNodeWithBreadth(parent, matcher) {
    let cur = parent.lastChild;
    while (cur) {
        if (matcher(cur)) {
            return cur;
        }
        cur = cur.previousSibling;
    }
    return null;
}
exports.reverseFindNodeWithBreadth = reverseFindNodeWithBreadth;
function collectNodeWithBreadth(parent, matcher, matches) {
    let cur = parent.firstChild;
    if (matcher(cur)) {
        matches.push(cur);
    }
    while (cur) {
        if (matcher(cur.nextSibling)) {
            matches.push(cur);
        }
        cur = cur.nextSibling;
    }
}
exports.collectNodeWithBreadth = collectNodeWithBreadth;
function collectNodeWithDepth(parent, matcher, matches) {
    let cur = parent.firstChild;
    while (cur) {
        if (matcher(cur)) {
            matches.push(cur);
        }
        cur = cur.firstChild;
    }
}
exports.collectNodeWithDepth = collectNodeWithDepth;
function findNodeWithBreadth(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        if (matcher(cur)) {
            return cur;
        }
        cur = cur.nextSibling;
    }
    return null;
}
exports.findNodeWithBreadth = findNodeWithBreadth;
function findNodeWithDepth(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        if (matcher(cur)) {
            return cur;
        }
        cur = cur.firstChild;
    }
    return null;
}
exports.findNodeWithDepth = findNodeWithDepth;
function findDepthFirst(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        const found = findNodeWithDepth(cur, matcher);
        if (found) {
            return found;
        }
        cur = cur.nextSibling;
    }
    return null;
}
exports.findDepthFirst = findDepthFirst;
function collectDepthFirst(parent, matcher, matches) {
    let cur = parent.firstChild;
    while (cur) {
        collectNodeWithDepth(cur, matcher, matches);
        cur = cur.nextSibling;
    }
    return;
}
exports.collectDepthFirst = collectDepthFirst;
function findBreadthFirst(parent, matcher) {
    let cur = parent.firstChild;
    while (cur) {
        const found = findNodeWithBreadth(cur, matcher);
        if (found) {
            return found;
        }
        cur = cur.firstChild;
    }
    return null;
}
exports.findBreadthFirst = findBreadthFirst;
function applyEachNode(parent, fn) {
    fn(parent);
    let cur = parent.firstChild;
    while (cur) {
        applyEachNode(cur.nextSibling, fn);
        cur = cur.nextSibling;
    }
}
exports.applyEachNode = applyEachNode;
function eachChildAndNode(node, fn) {
    const list = node.childNodes;
    for (let i = 0; i < list.length; i++) {
        fn(list[i]);
    }
    fn(node);
}
exports.eachChildAndNode = eachChildAndNode;
function eachNodeAndChild(node, fn) {
    fn(node);
    const list = node.childNodes;
    for (let i = 0; i < list.length; i++) {
        fn(list[i]);
    }
}
exports.eachNodeAndChild = eachNodeAndChild;
function reverseApplyEachNode(parent, fn) {
    let cur = parent.lastChild;
    while (cur) {
        reverseApplyEachNode(cur, fn);
        cur = cur.previousSibling;
    }
    fn(parent);
}
exports.reverseApplyEachNode = reverseApplyEachNode;
function collectBreadthFirst(parent, matcher, matches) {
    let cur = parent.firstChild;
    while (cur) {
        collectNodeWithBreadth(cur, matcher, matches);
        cur = cur.firstChild;
    }
    return;
}
exports.collectBreadthFirst = collectBreadthFirst;
function getActiveElement(node) {
    const root = getRootNode.call(node);
    return isDocumentRoot(root) ? root.activeElement : null;
}
exports.getActiveElement = getActiveElement;
function getFocusedPath(node, root) {
    const activeElement = getActiveElement(node);
    if (!activeElement || !node.contains(activeElement)) {
        return [];
    }
    return getAncestry(activeElement, root);
}
exports.getFocusedPath = getFocusedPath;
function moveBefore(parentNode, node, referenceNode) {
    const insertReferenceNode = node.nextSibling;
    let cur = referenceNode;
    while (cur !== null && cur !== node) {
        const next = cur.nextSibling;
        parentNode.insertBefore(cur, insertReferenceNode);
        cur = next;
    }
}
exports.moveBefore = moveBefore;
function insertBefore(parentNode, node, referenceNode) {
    if (referenceNode === null) {
        parentNode.appendChild(node);
        return null;
    }
    parentNode.insertBefore(node, referenceNode);
    return null;
}
exports.insertBefore = insertBefore;
function replaceNode(parentNode, node, replacement) {
    if (replacement === null) {
        return null;
    }
    parentNode.replaceChild(replacement, node);
    return null;
}
exports.replaceNode = replaceNode;
function replaceNodeIf(targetNode, replacement) {
    if (replacement === null) {
        return false;
    }
    const parent = targetNode.parentNode;
    if (!parent) {
        return false;
    }
    parent.replaceChild(replacement, targetNode);
    return true;
}
exports.replaceNodeIf = replaceNodeIf;
function getNamespace(name) {
    if (name.lastIndexOf('xml:', 0) === 0) {
        return 'http://www.w3.org/XML/1998/namespace';
    }
    if (name.lastIndexOf('xlink:', 0) === 0) {
        return 'http://www.w3.org/1999/xlink';
    }
    return undefined;
}
exports.getNamespace = getNamespace;
function applyAttr(el, name, value) {
    if (value == null) {
        el.removeAttribute(name);
    }
    else {
        const attrNS = getNamespace(name);
        if (attrNS) {
            el.setAttributeNS(attrNS, name, String(value));
        }
        else {
            el.setAttribute(name, String(value));
        }
    }
}
exports.applyAttr = applyAttr;
function applyAttrs(el, values) {
    for (let key in values) {
        if (values[key] == null) {
            el.removeAttribute(key);
            continue;
        }
        el.setAttribute(key, values[key]);
    }
}
exports.applyAttrs = applyAttrs;
function applyProp(el, name, value) {
    el[name] = value;
}
exports.applyProp = applyProp;
function setStyleValue(style, prop, value) {
    if (prop.indexOf('-') >= 0) {
        style.setProperty(prop, value);
    }
    else {
        style[prop] = value;
    }
}
exports.setStyleValue = setStyleValue;
function applySVGStyle(el, name, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applySVGStyle = applySVGStyle;
function applyStyle(el, name, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applyStyle = applyStyle;
function applyStyles(el, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applyStyles = applyStyles;
function applySVGStyles(el, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        const elStyle = el.style;
        for (const prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applySVGStyles = applySVGStyles;
function applyAttributeTyped(el, name, value) {
    const type = typeof value;
    if (type === 'object' || type === 'function') {
        applyProp(el, name, value);
    }
    else {
        applyAttr(el, name, value);
    }
}
exports.applyAttributeTyped = applyAttributeTyped;
function getNamespaceForTag(tag, parent) {
    if (tag === 'svg') {
        return 'http://www.w3.org/2000/svg';
    }
    if (tag === 'math') {
        return 'http://www.w3.org/1998/Math/MathML';
    }
    if (parent == null) {
        return null;
    }
    return parent.namespaceURI;
}
exports.getNamespaceForTag = getNamespaceForTag;
function recordAttributes(node) {
    const attrs = {};
    const attributes = node.attributes;
    const length = attributes.length;
    if (!length) {
        return attrs;
    }
    for (let i = 0, j = 0; i < length; i += 1, j += 2) {
        const attr = attributes[i];
        attrs[attr.name] = attr.value;
    }
    return attrs;
}
exports.recordAttributes = recordAttributes;
function createElement(doc, nameOrCtor, key, content, attributes, namespace) {
    let el;
    if (typeof nameOrCtor === 'function') {
        el = new nameOrCtor();
        return el;
    }
    namespace = namespace.trim();
    if (namespace.length > 0) {
        switch (nameOrCtor) {
            case 'svg':
                el = doc.createElementNS('http://www.w3.org/2000/svg', nameOrCtor);
                break;
            case 'math':
                el = doc.createElementNS('http://www.w3.org/1998/Math/MathML', nameOrCtor);
                break;
            default:
                el = doc.createElementNS(namespace, nameOrCtor);
        }
    }
    else {
        el = doc.createElement(nameOrCtor);
    }
    el.setAttribute('_key', key);
    if (attributes) {
        applyAttrs(el, attributes);
    }
    if (content.length > 0) {
        el.innerHTML = content;
    }
    return el;
}
exports.createElement = createElement;
function createText(doc, text, key) {
    const node = doc.createTextNode(text);
    exts.Objects.PatchWith(node, 'key', key);
    return node;
}
exports.createText = createText;
function removeFromNode(fromNode, endNode) {
    const parentNode = fromNode.parentNode;
    let child = fromNode;
    while (child !== endNode) {
        const next = child.nextSibling;
        parentNode.removeChild(child);
        child = next;
    }
}
exports.removeFromNode = removeFromNode;
//# sourceMappingURL=dom.js.map