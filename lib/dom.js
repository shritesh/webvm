"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var exts = require("./extensions");
// ELEMENT_NODE represents element node type value.
exports.ELEMENT_NODE = 1;
// DOCUMENT_FRAGMENT_NODE represents documentFragment node type value.
exports.DOCUMENT_FRAGMENT_NODE = 11;
// DOCUMENT_NODE represents document node type value.
exports.DOCUMENT_NODE = 9;
// TEXT_NODE represents text node type value.
exports.TEXT_NODE = 3;
// COMMENT_NODE represents comment node type value.
exports.COMMENT_NODE = 8;
var attributes = utils_1.createMap();
attributes['style'] = applyStyle;
/**
 * Checks if the node is the root of a document. This is either a Document
 * or ShadowRoot. DocumentFragments are included for simplicity of the
 * implementation, though we only want to consider Documents or ShadowRoots.
 * @param node The node to check.
 * @return True if the node the root of a document, false otherwise.
 */
function isDocumentRoot(node) {
    return node.nodeType === 11 || node.nodeType === 9;
}
exports.isDocumentRoot = isDocumentRoot;
/**
 * Checks if the node is an Element. This is faster than an instanceof check.
 * @param node The node to check.
 * @return Whether or not the node is an Element.
 */
function isElement(node) {
    return node.nodeType === 1;
}
exports.isElement = isElement;
/**
 * Checks if the node is a text node. This is faster than an instanceof check.
 * @param node The node to check.
 * @return Whether or not the node is a Text.
 */
function isText(node) {
    return node.nodeType === 3;
}
exports.isText = isText;
/**
 * @param  node The node to start at, inclusive.
 * @param  root The root ancestor to get until, exclusive.
 * @return The ancestry of DOM nodes.
 */
function getAncestry(node, root) {
    var ancestry = [];
    var cur = node;
    while (cur !== root) {
        var n = cur;
        ancestry.push(n);
        cur = n.parentNode;
    }
    return ancestry;
}
exports.getAncestry = getAncestry;
/**
 * return The root node of the DOM tree that contains this node.
 */
var getRootNode = 
// tslint:disable-next-line:no-any b/79476176
Node.prototype.getRootNode || function () {
    // tslint:disable-next-line:no-unnecessary-type-assertion b/77361044
    var cur = this;
    var prev = cur;
    while (cur) {
        prev = cur;
        cur = cur.parentNode;
    }
    return prev;
};
/**
 * @param node The node to get the activeElement for.
 * @return The activeElement in the Document or ShadowRoot
 *     corresponding to node, if present.
 */
function getActiveElement(node) {
    var root = getRootNode.call(node);
    return isDocumentRoot(root) ? root.activeElement : null;
}
exports.getActiveElement = getActiveElement;
/**
 * Gets the path of nodes that contain the focused node in the same document as
 * a reference node, up until the root.
 * @param node The reference node to get the activeElement for.
 * @param root The root to get the focused path until.
 */
function getFocusedPath(node, root) {
    var activeElement = getActiveElement(node);
    if (!activeElement || !node.contains(activeElement)) {
        return [];
    }
    return getAncestry(activeElement, root);
}
exports.getFocusedPath = getFocusedPath;
/**
 * Like insertBefore, but instead instead of moving the desired node, instead
 * moves all the other nodes after.
 * @param parentNode
 * @param node
 * @param referenceNode
 */
function moveBefore(parentNode, node, referenceNode) {
    var insertReferenceNode = node.nextSibling;
    var cur = referenceNode;
    while (cur !== null && cur !== node) {
        var next = cur.nextSibling;
        parentNode.insertBefore(cur, insertReferenceNode);
        cur = next;
    }
}
exports.moveBefore = moveBefore;
/**
 * insertBefore inserts giving node before reference node.
 * If reference node is null, then a normal appendChild is used with
 * parent to insert giving node.
 * @param parentNode
 * @param node
 * @param referenceNode
 */
function insertBefore(parentNode, node, referenceNode) {
    if (referenceNode === null) {
        parentNode.appendChild(node);
        return null;
    }
    parentNode.insertBefore(node, referenceNode);
    return null;
}
exports.insertBefore = insertBefore;
/**
 * replaceNode replaces giving node with provided replacement node.
 * @param parentNode
 * @param node
 * @param replacement
 */
function replaceNode(parentNode, node, replacement) {
    if (replacement === null) {
        return null;
    }
    parentNode.replaceChild(replacement, node);
    return null;
}
exports.replaceNode = replaceNode;
/**
 * replaceNodeIf replaces giving node with provided replacement node by using
 * parent of giving node if and only if it has one.
 *
 * It returns true/false if a replacement was actually done.
 * @param targetNode
 * @param replacement
 */
function replaceNodeIf(targetNode, replacement) {
    if (replacement === null) {
        return false;
    }
    var parent = targetNode.parentNode;
    if (!parent) {
        return false;
    }
    parent.replaceChild(replacement, targetNode);
    return true;
}
exports.replaceNodeIf = replaceNodeIf;
/**
 * Returns the namespace to use for the attribute.
 */
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
/**
 * Applies an attribute or property to a given Element. If the value is null
 * or undefined, it is removed from the Element. Otherwise, the value is set
 * as an attribute.
 */
// tslint:disable-next-line:no-any
function applyAttr(el, name, value) {
    if (value == null) {
        el.removeAttribute(name);
    }
    else {
        var attrNS = getNamespace(name);
        if (attrNS) {
            el.setAttributeNS(attrNS, name, String(value));
        }
        else {
            el.setAttribute(name, String(value));
        }
    }
}
exports.applyAttr = applyAttr;
// applyAttrs applies a giving map of key-value pairs into a attribute
// list. If the giving value of a key in a map is null, then that key is
// removed from the Element.
function applyAttrs(el, values) {
    for (var key in values) {
        if (values[key] == null) {
            el.removeAttribute(key);
            continue;
        }
        el.setAttribute(key, values[key]);
    }
}
exports.applyAttrs = applyAttrs;
/**
 * Applies a property to a given Element.
 */
// tslint:disable-next-line:no-any
function applyProp(el, name, value) {
    // tslint:disable-next-line:no-any
    el[name] = value;
}
exports.applyProp = applyProp;
/**
 * Applies a value to a style declaration. Supports CSS custom properties by
 * setting properties containing a dash using CSSStyleDeclaration.setProperty.
 */
function setStyleValue(style, prop, value) {
    if (prop.indexOf('-') >= 0) {
        style.setProperty(prop, value);
    }
    else {
        // TODO(tomnguyen) Figure out why this is necessary.
        // tslint:disable-next-line:no-any
        style[prop] = value;
    }
}
exports.setStyleValue = setStyleValue;
/**
 * Applies a style to an Element. No vendor prefix expansion is done for
 * property names/values.
 * @param el
 * @param name The attribute's name.
 * @param  style The style to set. Either a string of css or an object
 *     containing property-value pairs.
 */
function applySVGStyle(el, name, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        var elStyle = el.style;
        for (var prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applySVGStyle = applySVGStyle;
/**
 * Applies a style to an Element. No vendor prefix expansion is done for
 * property names/values.
 * @param el
 * @param name The attribute's name.
 * @param  style The style to set. Either a string of css or an object
 *     containing property-value pairs.
 */
function applyStyle(el, name, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        var elStyle = el.style;
        for (var prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applyStyle = applyStyle;
/**
 * applyStyles applies a map of style attributes to an Element.
 * No vendor prefix expansion is done for
 * property names/values.
 * @param el is the main HTMLElement
 * @param  style The style to set. Either a string of css or an object
 *     containing property-value pairs.
 */
function applyStyles(el, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        var elStyle = el.style;
        for (var prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applyStyles = applyStyles;
/**
 * applyStyles applies a map of style attributes to an Element.
 * No vendor prefix expansion is done for
 * property names/values.
 * @param el is the main SVGElement
 * @param  style The style to set. Either a string of css or an object
 *     containing property-value pairs.
 */
function applySVGStyles(el, style) {
    if (typeof style === 'string') {
        el.style.cssText = style;
    }
    else {
        el.style.cssText = '';
        var elStyle = el.style;
        for (var prop in style) {
            if (utils_1.has(style, prop)) {
                setStyleValue(elStyle, prop, style[prop]);
            }
        }
    }
}
exports.applySVGStyles = applySVGStyles;
/**
 * Updates a single attribute on an Element.
 * @param el
 * @param name The attribute's name.
 * @param value The attribute's value. If the value is an object or
 *     function it is set on the Element, otherwise, it is set as an HTML
 *     attribute.
 */
function applyAttributeTyped(el, name, value) {
    var type = typeof value;
    if (type === 'object' || type === 'function') {
        applyProp(el, name, value);
    }
    else {
        applyAttr(el, name, value);
    }
}
exports.applyAttributeTyped = applyAttributeTyped;
/**
 * Gets the namespace to create an element (of a given tag) in.
 */
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
/**
 * Records the element's attributes.
 * @param node The Element that may have attributes
 */
function recordAttributes(node) {
    var attrs = {};
    var attributes = node.attributes;
    var length = attributes.length;
    if (!length) {
        return attrs;
    }
    // Use a cached length. The attributes array is really a live NamedNodeMap,
    // which exists as a DOM "Host Object" (probably as C++ code). This makes the
    // usual constant length iteration very difficult to optimize in JITs.
    for (var i = 0, j = 0; i < length; i += 1, j += 2) {
        var attr = attributes[i];
        attrs[attr.name] = attr.value;
    }
    return attrs;
}
exports.recordAttributes = recordAttributes;
/**
 * Creates an Element.
 * @param doc The document with which to create the Element.
 * @param nameOrCtor The tag or constructor for the Element.
 * @param key A key to identify the Element.
 * @param  content The underline html content for the Element.
 * @param  attributes The attributes map to apply to element.
 * @param  namespace The node namespace if specific to be used in creating element.
 */
function createElement(doc, nameOrCtor, key, content, attributes, namespace) {
    var el;
    if (typeof nameOrCtor === 'function') {
        el = new nameOrCtor();
        return el;
    }
    namespace = namespace.trim();
    if (namespace.length > 0) {
        switch (nameOrCtor) {
            case "svg":
                el = doc.createElementNS('http://www.w3.org/2000/svg', nameOrCtor);
                break;
            case "math":
                el = doc.createElementNS('http://www.w3.org/1998/Math/MathML', nameOrCtor);
                break;
            default:
                el = doc.createElementNS(namespace, nameOrCtor);
        }
    }
    else {
        el = doc.createElement(nameOrCtor);
    }
    // add key as attribute.
    el.setAttribute("_key", key);
    if (attributes) {
        applyAttrs(el, attributes);
    }
    // if content is provided then pass the content to the inner html.
    if (content.length > 0) {
        el.innerHTML = content;
    }
    return el;
}
exports.createElement = createElement;
/**
 * Creates a Text Node.
 * @param doc The document with which to create the Element.
 * @param text The content of giving text node.
 * @param key The unique key of giving text node.
 * @return
 */
function createText(doc, text, key) {
    var node = doc.createTextNode(text);
    exts.Objects.PatchWith(node, 'key', key);
    return node;
}
exports.createText = createText;
/**
 * Clears out any unvisited Nodes in a given range.
 * @param fromNode
 * @param endNode The node to clear until, exclusive.
 */
function removeFromNode(fromNode, endNode) {
    var parentNode = fromNode.parentNode;
    var child = fromNode;
    while (child !== endNode) {
        var next = child.nextSibling;
        parentNode.removeChild(child);
        child = next;
    }
}
exports.removeFromNode = removeFromNode;
// /**
//  * Aligns the virtual Node definition with the actual DOM, moving the
//  * corresponding DOM node to the correct location or creating it if necessary.
//  * @param nameOrCtor The name or constructor for the Node.
//  * @param key The key used to identify the Node.
//  */
// function alignWithDOM(nameOrCtor: NameOrCtorDef, key: Key) {
//   nextNode();
//   const existingNode = getMatchingNode(currentNode, nameOrCtor, key);
//   const node = existingNode || createNode(nameOrCtor, key);
//   // If we are at the matching node, then we are done.
//   if (node === currentNode) {
//     return;
//   }
//   // Re-order the node into the right position, preserving focus if either
//   // node or currentNode are focused by making sure that they are not detached
//   // from the DOM.
//   if (focusPath.indexOf(node) >= 0) {
//     // Move everything else before the node.
//     moveBefore(currentParent!, node, currentNode);
//   } else {
//     currentParent!.insertBefore(node, currentNode);
//   }
//   currentNode = node;
// }
// /**
//  * Checks whether or not the current node matches the specified nameOrCtor and
//  * key.
//  * @param matchNode A node to match the data to.
//  * @param nameOrCtor The name or constructor to check for.
//  * @param key The key used to identify the Node.
//  * @return True if the node matches, false otherwise.
//  */
// function matches(
//     matchNode: Node, nameOrCtor: NameOrCtorDef, key: Key) {
//   const data = getData(matchNode, key);
//   // Key check is done using double equals as we want to treat a null key the
//   // same as undefined. This should be okay as the only values allowed are
//   // strings, null and undefined so the == semantics are not too weird.
//   // tslint:disable-next-line:triple-equals
//   return nameOrCtor == data.nameOrCtor && key == data.key;
// }
// /**
//  * Finds the matching node, starting at `node` and looking at the subsequent
//  * siblings if a key is used.
//  * @param node The node to start looking at.
//  * @param nameOrCtor The name or constructor for the Node.
//  * @param key The key used to identify the Node.
//  */
// function getMatchingNode(
//     matchNode: Node|null, nameOrCtor: NameOrCtorDef, key: Key): Node|null {
//   if (!matchNode) {
//     return null;
//   }
//   if (matches(matchNode, nameOrCtor, key)) {
//     return matchNode;
//   }
//   if (key) {
//     while ((matchNode = matchNode.nextSibling)) {
//       if (matches(matchNode, nameOrCtor, key)) {
//         return matchNode;
//       }
//     }
//   }
//   return null;
// }
