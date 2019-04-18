(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const attributes = utils_1.createMap();
exports.attributes = attributes;
attributes['style'] = applyStyle;
function isDocumentRoot(node) {
    return node.nodeType === 11 || node.nodeType === 9;
}
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
const getRootNode = Node.prototype.getRootNode || function () {
    let cur = this;
    let prev = cur;
    while (cur) {
        prev = cur;
        cur = cur.parentNode;
    }
    return prev;
};
function getActiveElement(node) {
    const root = getRootNode.call(node);
    return isDocumentRoot(root) ? root.activeElement : null;
}
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
function getNamespace(name) {
    if (name.lastIndexOf('xml:', 0) === 0) {
        return 'http://www.w3.org/XML/1998/namespace';
    }
    if (name.lastIndexOf('xlink:', 0) === 0) {
        return 'http://www.w3.org/1999/xlink';
    }
    return undefined;
}
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
const symbols = {
    default: '__default'
};
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
function createElement(doc, nameOrCtor, key, content, attributes, parentNS) {
    let el;
    if (typeof nameOrCtor === 'function') {
        el = new nameOrCtor();
        return el;
    }
    const namespace = getNamespaceForTag(nameOrCtor, parentNS);
    if (namespace) {
        el = doc.createElementNS(namespace, nameOrCtor);
    }
    else {
        el = doc.createElement(nameOrCtor);
    }
    el.setAttribute("_key", key);
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
    return node;
}
exports.createText = createText;

},{"./utils":2}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hasOwnProperty = Object.prototype.hasOwnProperty;
function Blank() { }
Blank.prototype = Object.create(null);
function has(map, property) {
    return hasOwnProperty.call(map, property);
}
exports.has = has;
function createMap() {
    return new Blank();
}
exports.createMap = createMap;
function truncateArray(arr, length) {
    while (arr.length > length) {
        arr.pop();
    }
}
exports.truncateArray = truncateArray;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dom = require("./dom");
console.log("Hello RenderJSVM!", dom.isText);

},{"./dom":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZG9tLmpzIiwic3JjL3V0aWxzLmpzIiwic3JjL3dlYnZtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbmNvbnN0IGF0dHJpYnV0ZXMgPSB1dGlsc18xLmNyZWF0ZU1hcCgpO1xuZXhwb3J0cy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcbmF0dHJpYnV0ZXNbJ3N0eWxlJ10gPSBhcHBseVN0eWxlO1xuZnVuY3Rpb24gaXNEb2N1bWVudFJvb3Qobm9kZSkge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSAxMSB8fCBub2RlLm5vZGVUeXBlID09PSA5O1xufVxuZnVuY3Rpb24gaXNFbGVtZW50KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMTtcbn1cbmV4cG9ydHMuaXNFbGVtZW50ID0gaXNFbGVtZW50O1xuZnVuY3Rpb24gaXNUZXh0KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMztcbn1cbmV4cG9ydHMuaXNUZXh0ID0gaXNUZXh0O1xuZnVuY3Rpb24gZ2V0QW5jZXN0cnkobm9kZSwgcm9vdCkge1xuICAgIGNvbnN0IGFuY2VzdHJ5ID0gW107XG4gICAgbGV0IGN1ciA9IG5vZGU7XG4gICAgd2hpbGUgKGN1ciAhPT0gcm9vdCkge1xuICAgICAgICBjb25zdCBuID0gY3VyO1xuICAgICAgICBhbmNlc3RyeS5wdXNoKG4pO1xuICAgICAgICBjdXIgPSBuLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBhbmNlc3RyeTtcbn1cbmNvbnN0IGdldFJvb3ROb2RlID0gTm9kZS5wcm90b3R5cGUuZ2V0Um9vdE5vZGUgfHwgZnVuY3Rpb24gKCkge1xuICAgIGxldCBjdXIgPSB0aGlzO1xuICAgIGxldCBwcmV2ID0gY3VyO1xuICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgcHJldiA9IGN1cjtcbiAgICAgICAgY3VyID0gY3VyLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBwcmV2O1xufTtcbmZ1bmN0aW9uIGdldEFjdGl2ZUVsZW1lbnQobm9kZSkge1xuICAgIGNvbnN0IHJvb3QgPSBnZXRSb290Tm9kZS5jYWxsKG5vZGUpO1xuICAgIHJldHVybiBpc0RvY3VtZW50Um9vdChyb290KSA/IHJvb3QuYWN0aXZlRWxlbWVudCA6IG51bGw7XG59XG5mdW5jdGlvbiBnZXRGb2N1c2VkUGF0aChub2RlLCByb290KSB7XG4gICAgY29uc3QgYWN0aXZlRWxlbWVudCA9IGdldEFjdGl2ZUVsZW1lbnQobm9kZSk7XG4gICAgaWYgKCFhY3RpdmVFbGVtZW50IHx8ICFub2RlLmNvbnRhaW5zKGFjdGl2ZUVsZW1lbnQpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIGdldEFuY2VzdHJ5KGFjdGl2ZUVsZW1lbnQsIHJvb3QpO1xufVxuZXhwb3J0cy5nZXRGb2N1c2VkUGF0aCA9IGdldEZvY3VzZWRQYXRoO1xuZnVuY3Rpb24gbW92ZUJlZm9yZShwYXJlbnROb2RlLCBub2RlLCByZWZlcmVuY2VOb2RlKSB7XG4gICAgY29uc3QgaW5zZXJ0UmVmZXJlbmNlTm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgbGV0IGN1ciA9IHJlZmVyZW5jZU5vZGU7XG4gICAgd2hpbGUgKGN1ciAhPT0gbnVsbCAmJiBjdXIgIT09IG5vZGUpIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IGN1ci5uZXh0U2libGluZztcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY3VyLCBpbnNlcnRSZWZlcmVuY2VOb2RlKTtcbiAgICAgICAgY3VyID0gbmV4dDtcbiAgICB9XG59XG5leHBvcnRzLm1vdmVCZWZvcmUgPSBtb3ZlQmVmb3JlO1xuZnVuY3Rpb24gZ2V0TmFtZXNwYWNlKG5hbWUpIHtcbiAgICBpZiAobmFtZS5sYXN0SW5kZXhPZigneG1sOicsIDApID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlJztcbiAgICB9XG4gICAgaWYgKG5hbWUubGFzdEluZGV4T2YoJ3hsaW5rOicsIDApID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayc7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5mdW5jdGlvbiBhcHBseUF0dHIoZWwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc3QgYXR0ck5TID0gZ2V0TmFtZXNwYWNlKG5hbWUpO1xuICAgICAgICBpZiAoYXR0ck5TKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhhdHRyTlMsIG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5hcHBseUF0dHIgPSBhcHBseUF0dHI7XG5mdW5jdGlvbiBhcHBseUF0dHJzKGVsLCB2YWx1ZXMpIHtcbiAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWVzKSB7XG4gICAgICAgIGlmICh2YWx1ZXNba2V5XSA9PSBudWxsKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlc1trZXldKTtcbiAgICB9XG59XG5leHBvcnRzLmFwcGx5QXR0cnMgPSBhcHBseUF0dHJzO1xuZnVuY3Rpb24gYXBwbHlQcm9wKGVsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGVsW25hbWVdID0gdmFsdWU7XG59XG5leHBvcnRzLmFwcGx5UHJvcCA9IGFwcGx5UHJvcDtcbmZ1bmN0aW9uIHNldFN0eWxlVmFsdWUoc3R5bGUsIHByb3AsIHZhbHVlKSB7XG4gICAgaWYgKHByb3AuaW5kZXhPZignLScpID49IDApIHtcbiAgICAgICAgc3R5bGUuc2V0UHJvcGVydHkocHJvcCwgdmFsdWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3R5bGVbcHJvcF0gPSB2YWx1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiBhcHBseVNWR1N0eWxlKGVsLCBuYW1lLCBzdHlsZSkge1xuICAgIGlmICh0eXBlb2Ygc3R5bGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSAnJztcbiAgICAgICAgY29uc3QgZWxTdHlsZSA9IGVsLnN0eWxlO1xuICAgICAgICBmb3IgKGNvbnN0IHByb3AgaW4gc3R5bGUpIHtcbiAgICAgICAgICAgIGlmICh1dGlsc18xLmhhcyhzdHlsZSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBzZXRTdHlsZVZhbHVlKGVsU3R5bGUsIHByb3AsIHN0eWxlW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuYXBwbHlTVkdTdHlsZSA9IGFwcGx5U1ZHU3R5bGU7XG5mdW5jdGlvbiBhcHBseVN0eWxlKGVsLCBuYW1lLCBzdHlsZSkge1xuICAgIGlmICh0eXBlb2Ygc3R5bGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSAnJztcbiAgICAgICAgY29uc3QgZWxTdHlsZSA9IGVsLnN0eWxlO1xuICAgICAgICBmb3IgKGNvbnN0IHByb3AgaW4gc3R5bGUpIHtcbiAgICAgICAgICAgIGlmICh1dGlsc18xLmhhcyhzdHlsZSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBzZXRTdHlsZVZhbHVlKGVsU3R5bGUsIHByb3AsIHN0eWxlW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuYXBwbHlTdHlsZSA9IGFwcGx5U3R5bGU7XG5mdW5jdGlvbiBhcHBseVN0eWxlcyhlbCwgc3R5bGUpIHtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gJyc7XG4gICAgICAgIGNvbnN0IGVsU3R5bGUgPSBlbC5zdHlsZTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAodXRpbHNfMS5oYXMoc3R5bGUsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgc2V0U3R5bGVWYWx1ZShlbFN0eWxlLCBwcm9wLCBzdHlsZVtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFwcGx5U3R5bGVzID0gYXBwbHlTdHlsZXM7XG5mdW5jdGlvbiBhcHBseVNWR1N0eWxlcyhlbCwgc3R5bGUpIHtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gJyc7XG4gICAgICAgIGNvbnN0IGVsU3R5bGUgPSBlbC5zdHlsZTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAodXRpbHNfMS5oYXMoc3R5bGUsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgc2V0U3R5bGVWYWx1ZShlbFN0eWxlLCBwcm9wLCBzdHlsZVtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBhcHBseUF0dHJpYnV0ZVR5cGVkKGVsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gICAgaWYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYXBwbHlQcm9wKGVsLCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhcHBseUF0dHIoZWwsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG59XG5leHBvcnRzLmFwcGx5QXR0cmlidXRlVHlwZWQgPSBhcHBseUF0dHJpYnV0ZVR5cGVkO1xuY29uc3Qgc3ltYm9scyA9IHtcbiAgICBkZWZhdWx0OiAnX19kZWZhdWx0J1xufTtcbmZ1bmN0aW9uIGdldE5hbWVzcGFjZUZvclRhZyh0YWcsIHBhcmVudCkge1xuICAgIGlmICh0YWcgPT09ICdzdmcnKSB7XG4gICAgICAgIHJldHVybiAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuICAgIH1cbiAgICBpZiAodGFnID09PSAnbWF0aCcpIHtcbiAgICAgICAgcmV0dXJuICdodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MJztcbiAgICB9XG4gICAgaWYgKHBhcmVudCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQoZG9jLCBuYW1lT3JDdG9yLCBrZXksIGNvbnRlbnQsIGF0dHJpYnV0ZXMsIHBhcmVudE5TKSB7XG4gICAgbGV0IGVsO1xuICAgIGlmICh0eXBlb2YgbmFtZU9yQ3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBlbCA9IG5ldyBuYW1lT3JDdG9yKCk7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9XG4gICAgY29uc3QgbmFtZXNwYWNlID0gZ2V0TmFtZXNwYWNlRm9yVGFnKG5hbWVPckN0b3IsIHBhcmVudE5TKTtcbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2UsIG5hbWVPckN0b3IpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZWwgPSBkb2MuY3JlYXRlRWxlbWVudChuYW1lT3JDdG9yKTtcbiAgICB9XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiX2tleVwiLCBrZXkpO1xuICAgIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGFwcGx5QXR0cnMoZWwsIGF0dHJpYnV0ZXMpO1xuICAgIH1cbiAgICBpZiAoY29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cbmV4cG9ydHMuY3JlYXRlRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQ7XG5mdW5jdGlvbiBjcmVhdGVUZXh0KGRvYywgdGV4dCwga2V5KSB7XG4gICAgY29uc3Qgbm9kZSA9IGRvYy5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbiAgICByZXR1cm4gbm9kZTtcbn1cbmV4cG9ydHMuY3JlYXRlVGV4dCA9IGNyZWF0ZVRleHQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kb20uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5mdW5jdGlvbiBCbGFuaygpIHsgfVxuQmxhbmsucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbmZ1bmN0aW9uIGhhcyhtYXAsIHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwobWFwLCBwcm9wZXJ0eSk7XG59XG5leHBvcnRzLmhhcyA9IGhhcztcbmZ1bmN0aW9uIGNyZWF0ZU1hcCgpIHtcbiAgICByZXR1cm4gbmV3IEJsYW5rKCk7XG59XG5leHBvcnRzLmNyZWF0ZU1hcCA9IGNyZWF0ZU1hcDtcbmZ1bmN0aW9uIHRydW5jYXRlQXJyYXkoYXJyLCBsZW5ndGgpIHtcbiAgICB3aGlsZSAoYXJyLmxlbmd0aCA+IGxlbmd0aCkge1xuICAgICAgICBhcnIucG9wKCk7XG4gICAgfVxufVxuZXhwb3J0cy50cnVuY2F0ZUFycmF5ID0gdHJ1bmNhdGVBcnJheTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0aWxzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZG9tID0gcmVxdWlyZShcIi4vZG9tXCIpO1xuY29uc29sZS5sb2coXCJIZWxsbyBSZW5kZXJKU1ZNIVwiLCBkb20uaXNUZXh0KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXdlYnZtLmpzLm1hcCJdfQ==
