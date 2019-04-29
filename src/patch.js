"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dom = require("./dom");
const utils = require("./utils");
const exts = require("./extensions");
const dom_1 = require("./dom");
exports.DefaultNodeDictator = {
    Same: (n, m) => {
        return n.nodeType == m.nodeType && n.nodeName == m.nodeName;
    },
    Changed: (n, m) => {
        if (n.nodeType === dom.TEXT_NODE && m.nodeType === dom.TEXT_NODE) {
            return n.textContent === m.textContent;
        }
        if (n.nodeType === dom.COMMENT_NODE && m.nodeType === dom.COMMENT_NODE) {
            return n.textContent === m.textContent;
        }
        const mattrs = dom.recordAttributes(m);
        const nattrs = dom.recordAttributes(n);
        return !utils.isEqual(mattrs, nattrs);
    },
};
exports.DefaultJSONDictator = {
    Same: (n, m) => {
        return n.nodeName === m.name && n.nodeType == m.type;
    },
    Changed: (n, m) => {
        if (n.nodeType === dom.TEXT_NODE && m.type === dom.TEXT_NODE) {
            return n.textContent !== m.content;
        }
        if (n.nodeType === dom.COMMENT_NODE && m.type === dom.COMMENT_NODE) {
            return n.textContent !== m.content;
        }
        const tnode = n;
        const id = tnode.getAttribute("_id");
        if (id !== m.id) {
            return true;
        }
        const ref = tnode.getAttribute("_ref");
        if (ref !== m.ref) {
            return true;
        }
        const tid = tnode.getAttribute("_tid");
        const atid = tnode.getAttribute("_atid");
        if (tid !== m.tid && atid !== m.atid) {
            return true;
        }
        if (tid !== m.tid && atid === m.atid) {
            return true;
        }
        const mevents = BuildEvent(m.events);
        const events = tnode.getAttribute("_events");
        return mevents !== events;
    },
};
function ToJSONNode(node, shallow) {
    const jnode = {};
    jnode.type = node.nodeType;
    jnode.name = node.nodeName;
    jnode.id = exts.Objects.GetAttrWith(node, "_id");
    jnode.tid = exts.Objects.GetAttrWith(node, "tid");
    jnode.ref = exts.Objects.GetAttrWith(node, "_ref");
    jnode.atid = exts.Objects.GetAttrWith(node, "_atid");
    const elem = node;
    jnode.tid = node._tid;
    switch (node.nodeType) {
        case dom_1.TEXT_NODE:
            jnode.typeName = "Text";
            jnode.content = node.textContent;
            break;
        case dom_1.COMMENT_NODE:
            jnode.typeName = "Comment";
            jnode.content = node.textContent;
            break;
        case dom_1.ELEMENT_NODE:
            jnode.typeName = "Element";
            break;
        default:
            throw new Error(`unable to handle node type ${node.nodeType}`);
    }
    if (exts.Objects.isNullOrUndefined(elem)) {
        return jnode;
    }
    if (elem.hasAttribute("id")) {
        jnode.id = elem.getAttribute("id");
    }
    if (elem.hasAttribute("_ref")) {
        jnode.ref = elem.getAttribute("_ref");
    }
    if (elem.hasAttribute("_tid")) {
        jnode.tid = elem.getAttribute("_tid");
    }
    if (elem.hasAttribute("_atid")) {
        jnode.atid = elem.getAttribute("_atid");
    }
    if (elem.hasAttribute("events")) {
        jnode.events = elem.getAttribute("events").split(" ").map(function (item) {
            return JSONEvent(item);
        });
    }
    if (!shallow) {
        dom.eachNodeAndChild(node, function (child) {
            jnode.children.push(ToJSONNode(child, false));
        });
    }
    return jnode;
}
exports.ToJSONNode = ToJSONNode;
function JSONEvent(eventDesc) {
    const event = {};
    event.Name = eventDesc.substr(0, eventDesc.length - 3);
    switch (eventDesc.substr(eventDesc.length - 2, eventDesc.length)) {
        case "00":
            break;
        case "01":
            event.StopPropagation = true;
            break;
        case "10":
            event.PreventDefault = true;
            break;
        case "11":
            event.PreventDefault = true;
            event.StopPropagation = true;
            break;
    }
    return event;
}
exports.JSONEvent = JSONEvent;
function applyJSONNodeFunction(node, fn) {
    fn(node);
    node.children.forEach(function (child) {
        applyJSONNodeFunction(child, fn);
    });
}
exports.applyJSONNodeFunction = applyJSONNodeFunction;
function applyJSONNodeKidsFunction(node, fn) {
    node.children.forEach(function (child) {
        applyJSONNodeFunction(child, fn);
    });
    fn(node);
}
exports.applyJSONNodeKidsFunction = applyJSONNodeKidsFunction;
function isJSONNode(n) {
    const hasID = typeof n.id !== 'undefined';
    const hasRef = typeof n.ref !== 'undefined';
    const hasTid = typeof n.tid !== 'undefined';
    const hasTypeName = typeof n.typeName !== 'undefined';
    return hasID && hasRef && hasTypeName && hasTid;
}
exports.isJSONNode = isJSONNode;
function findElement(desc, parent) {
    const selector = desc.name + '#' + desc.id;
    const targets = parent.querySelectorAll(selector);
    if (targets.length === 0) {
        let attrSelector = desc.name + `[_tid='${desc.tid}']`;
        let target = parent.querySelector(attrSelector);
        if (target) {
            return target;
        }
        attrSelector = desc.name + `[_atid='${desc.atid}']`;
        target = parent.querySelector(attrSelector);
        if (target) {
            return target;
        }
        attrSelector = desc.name + `[_ref='${desc.ref}']`;
        return parent.querySelector(attrSelector);
    }
    if (targets.length === 1) {
        return targets[0];
    }
    const total = targets.length;
    for (let i = 0; i < total; i++) {
        const elem = targets.item(i);
        if (elem.getAttribute('_tid') === desc.tid) {
            return elem;
        }
        if (elem.getAttribute('_atid') === desc.atid) {
            return elem;
        }
        if (elem.getAttribute('_ref') === desc.ref) {
            return elem;
        }
    }
    return null;
}
exports.findElement = findElement;
function findElementbyRef(ref, parent) {
    const ids = ref.split('/').map(function (elem) {
        if (elem.trim() === '') {
            return '';
        }
        return '#' + elem;
    });
    if (ids.length === 0) {
        return null;
    }
    if (ids[0] === '' || ids[0].trim() === '') {
        ids.shift();
    }
    const first = ids[0];
    if (parent.id == first.substr(1)) {
        ids.shift();
    }
    let cur = parent.querySelector(ids.shift());
    while (cur) {
        if (ids.length === 0) {
            return cur;
        }
        cur = cur.querySelector(ids.shift());
    }
    return cur;
}
exports.findElementbyRef = findElementbyRef;
function findElementParentbyRef(ref, parent) {
    const ids = ref.split('/').map(function (elem) {
        if (elem.trim() === '') {
            return '';
        }
        return '#' + elem;
    });
    if (ids.length === 0) {
        return null;
    }
    if (ids[0] === '' || ids[0].trim() === '') {
        ids.shift();
    }
    ids.pop();
    const first = ids[0];
    if (parent.id == first.substr(1)) {
        ids.shift();
    }
    let cur = parent.querySelector(ids.shift());
    while (cur) {
        if (ids.length === 0) {
            return cur;
        }
        cur = cur.querySelector(ids.shift());
    }
    return cur;
}
exports.findElementParentbyRef = findElementParentbyRef;
exports.DefaultJSONMaker = {
    Make: jsonMaker,
};
function jsonMaker(doc, descNode, shallow, skipRemoved) {
    if (descNode.type === dom_1.COMMENT_NODE) {
        const node = doc.createComment(descNode.content);
        exts.Objects.PatchWith(node, '_id', descNode.id);
        exts.Objects.PatchWith(node, '_ref', descNode.ref);
        exts.Objects.PatchWith(node, '_tid', descNode.tid);
        exts.Objects.PatchWith(node, '_atid', descNode.atid);
        return node;
    }
    if (descNode.type === dom_1.TEXT_NODE) {
        const node = doc.createTextNode(descNode.content);
        exts.Objects.PatchWith(node, '_id', descNode.id);
        exts.Objects.PatchWith(node, '_ref', descNode.ref);
        exts.Objects.PatchWith(node, '_tid', descNode.tid);
        exts.Objects.PatchWith(node, '_atid', descNode.atid);
        return node;
    }
    let node;
    if (descNode.namespace.length !== 0) {
        node = doc.createElement(descNode.name);
    }
    else {
        node = doc.createElementNS(descNode.namespace, descNode.name);
    }
    exts.Objects.PatchWith(node, '_id', descNode.id);
    exts.Objects.PatchWith(node, '_ref', descNode.ref);
    exts.Objects.PatchWith(node, '_tid', descNode.tid);
    exts.Objects.PatchWith(node, '_atid', descNode.atid);
    node.setAttribute('id', descNode.id);
    node.setAttribute('_tid', descNode.tid);
    node.setAttribute('_ref', descNode.ref);
    node.setAttribute('_atid', descNode.atid);
    node.setAttribute('events', BuildEvent(descNode.events));
    descNode.attrs.forEach(function attrs(attr) {
        node.setAttribute(attr.Key, attr.Value);
    });
    if (descNode.removed) {
        node.setAttribute('_removed', 'true');
        return node;
    }
    if (!shallow) {
        descNode.children.forEach(function (kidJSON) {
            if (skipRemoved && kidJSON.removed) {
                return;
            }
            node.appendChild(jsonMaker(doc, kidJSON, shallow, skipRemoved));
        });
    }
    return node;
}
exports.jsonMaker = jsonMaker;
function BuildEvent(events) {
    const values = new Array();
    events.forEach(function attrs(attr) {
        const eventName = attr.Name + '-' + (attr.PreventDefault ? '1' : '0') + (attr.StopPropagation ? '1' : '0');
        values.push(eventName);
    });
    return values.join(' ');
}
exports.BuildEvent = BuildEvent;
function PatchJSONNodeTree(fragment, mount, dictator, maker) {
    let targetNode = findElement(fragment, mount);
    if (exts.Objects.isNullOrUndefined(targetNode)) {
        const tNode = maker.Make(document, fragment, false, true);
        mount.appendChild(targetNode);
        return;
    }
    PatchJSONNode(fragment, targetNode, dictator, maker);
}
exports.PatchJSONNodeTree = PatchJSONNodeTree;
function PatchJSONNode(fragment, targetNode, dictator, maker) {
    if (!dictator.Same(targetNode, fragment)) {
        const tNode = maker.Make(document, fragment, false, true);
        dom.replaceNode(targetNode.parentNode, targetNode, tNode);
        return;
    }
    if (!dictator.Changed(targetNode, fragment)) {
        return;
    }
    PatchJSONAttributes(fragment, targetNode);
    const totalKids = targetNode.childNodes.length;
    const fragmentKids = fragment.children.length;
    let i = 0;
    for (; i < totalKids; i++) {
        const childNode = targetNode.childNodes[i];
        if (i >= fragmentKids) {
            childNode.remove();
            continue;
        }
        const childFragment = fragment.children[i];
        PatchJSONNode(childFragment, childNode, dictator, maker);
    }
    for (; i < fragmentKids; i++) {
        const tNode = maker.Make(document, fragment, false, true);
        targetNode.appendChild(tNode);
    }
    return;
}
exports.PatchJSONNode = PatchJSONNode;
function StreamJSONNodes(fragment, mount, dictator, maker) {
    const changes = fragment.filter(function (elem) {
        return !elem.removed;
    });
    fragment
        .filter(function (elem) {
        if (!elem.removed) {
            return false;
        }
        let filtered = true;
        changes.forEach(function (el) {
            if (elem.tid === el.tid || elem.tid == el.atid || elem.ref === el.ref) {
                filtered = false;
            }
        });
        return filtered;
    })
        .forEach(function (removal) {
        const target = findElement(removal, mount);
        if (target) {
            target.remove();
        }
    });
    changes.forEach(function (change) {
        const targetNode = findElement(change, mount);
        if (exts.Objects.isNullOrUndefined(targetNode)) {
            const targetNodeParent = findElementParentbyRef(change.ref, mount);
            if (exts.Objects.isNullOrUndefined(targetNodeParent)) {
                console.log('Unable to apply new change stream: ', change);
                return;
            }
            const tNode = maker.Make(document, change, false, true);
            targetNodeParent.appendChild(tNode);
            return;
        }
        ApplyStreamNode(change, targetNode, dictator, maker);
    });
    return;
}
exports.StreamJSONNodes = StreamJSONNodes;
function ApplyStreamNode(fragment, targetNode, dictator, maker) {
    if (!dictator.Same(targetNode, fragment)) {
        const tNode = maker.Make(document, fragment, false, true);
        dom.replaceNode(targetNode.parentNode, targetNode, tNode);
        return;
    }
    if (dictator.Changed(targetNode, fragment)) {
        PatchJSONAttributes(fragment, targetNode);
    }
    const totalKids = targetNode.childNodes.length;
    const fragmentKids = fragment.children.length;
    let i = 0;
    for (; i < totalKids; i++) {
        const childNode = targetNode.childNodes[i];
        if (i >= fragmentKids) {
            return;
        }
        const childFragment = fragment.children[i];
        PatchJSONNode(childFragment, childNode, dictator, maker);
    }
    for (; i < fragmentKids; i++) {
        const tNode = maker.Make(document, fragment, false, true);
        targetNode.appendChild(tNode);
    }
    return;
}
exports.ApplyStreamNode = ApplyStreamNode;
function PatchTextCommentWithJSON(fragment, target) {
    if (fragment.type !== dom_1.COMMENT_NODE && fragment.type !== dom_1.TEXT_NODE) {
        return;
    }
    if (fragment.type !== dom_1.COMMENT_NODE && fragment.type !== dom_1.TEXT_NODE) {
        return;
    }
    if (target.textContent === fragment.content) {
        return;
    }
    target.textContent = fragment.content;
    exts.Objects.PatchWith(target, '_ref', fragment.ref);
    exts.Objects.PatchWith(target, '_tid', fragment.tid);
    exts.Objects.PatchWith(target, '_atid', fragment.atid);
}
exports.PatchTextCommentWithJSON = PatchTextCommentWithJSON;
function PatchJSONAttributes(node, target) {
    const oldNodeAttrs = dom.recordAttributes(target);
    node.attrs.forEach(function (attr) {
        const oldValue = oldNodeAttrs[attr.Key];
        delete oldNodeAttrs[attr.Key];
        if (attr.Value === oldValue) {
            return null;
        }
        target.setAttribute(attr.Key, attr.Value);
    });
    for (let index in oldNodeAttrs) {
        target.removeAttribute(index);
    }
    target.setAttribute('_tid', node.tid);
    target.setAttribute('_ref', node.ref);
    target.setAttribute('_atid', node.atid);
    target.setAttribute('events', BuildEvent(node.events));
    exts.Objects.PatchWith(target, '_id', node.id);
    exts.Objects.PatchWith(target, '_ref', node.ref);
    exts.Objects.PatchWith(target, '_tid', node.tid);
    exts.Objects.PatchWith(target, '_atid', node.atid);
}
exports.PatchJSONAttributes = PatchJSONAttributes;
function PatchDOMTree(newFragment, oldNodeOrMount, dictator, isChildRecursion) {
    if (isChildRecursion) {
        const rootNode = oldNodeOrMount.parentNode;
        if (!dictator.Same(oldNodeOrMount, newFragment)) {
            dom.replaceNode(rootNode, oldNodeOrMount, newFragment);
            return null;
        }
        if (!oldNodeOrMount.hasChildNodes()) {
            dom.replaceNode(rootNode, oldNodeOrMount, newFragment);
            return null;
        }
    }
    const oldChildren = oldNodeOrMount.childNodes;
    const oldChildrenLength = oldChildren.length;
    const newChildren = newFragment.childNodes;
    const newChildrenLength = newChildren.length;
    const removeOldLeft = newChildrenLength < oldChildrenLength;
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
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        if (!dictator.Changed(lastNode, newNodeHandled)) {
            continue;
        }
        if (lastNode.nodeType === dom.TEXT_NODE || lastNode.nodeType === dom.COMMENT_NODE) {
            if (lastNode.textContent !== newNodeHandled.textContent) {
                lastNode.textContent = newNodeHandled.textContent;
            }
            continue;
        }
        if (!lastNode.hasChildNodes() && newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        if (lastNode.hasChildNodes() && !newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        const lastElement = lastNode;
        const newElement = newNodeHandled;
        PatchDOMAttributes(newElement, lastElement);
        lastElement.setAttribute('_patched', 'true');
        PatchDOMTree(newElement, lastElement, dictator, true);
        lastElement.removeAttribute('_patched');
    }
    if (removeOldLeft && lastNodeNextSibling !== null) {
        dom.removeFromNode(lastNodeNextSibling, null);
        return null;
    }
    for (; lastIndex < newChildrenLength; lastIndex++) {
        const newNode = newChildren[lastIndex];
        oldNodeOrMount.appendChild(newNode);
    }
}
exports.PatchDOMTree = PatchDOMTree;
function PatchDOMAttributes(newElement, oldElement) {
    const oldNodeAttrs = dom.recordAttributes(oldElement);
    for (let index in newElement.attributes) {
        const attr = newElement.attributes[index];
        const oldValue = oldNodeAttrs[attr.name];
        delete oldNodeAttrs[attr.name];
        if (attr.value === oldValue) {
            continue;
        }
        oldElement.setAttribute(attr.name, attr.value);
    }
    for (let index in oldNodeAttrs) {
        oldElement.removeAttribute(index);
    }
}
exports.PatchDOMAttributes = PatchDOMAttributes;
//# sourceMappingURL=patch.js.map