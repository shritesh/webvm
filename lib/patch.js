"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dom = require("./dom");
// DefaultNodeDictator implements the NodeDictator interface.
exports.DefaultNodeDictator = {
    Same: function (n, m) {
        return n.nodeType == m.nodeType && n.nodeName == m.nodeName;
    },
    Changed: function (n, m) {
        return false;
    },
};
// DefaultJSONDictator implements the JSONDictator interface.
exports.DefaultJSONDictator = {
    Same: function (n, m) {
        return false;
    },
    Changed: function (n, m) {
        return false;
    },
};
// DefaultJSONMaker implements the JSONMaker interface.
exports.DefaultJSONMaker = {
    Make: function (doc, descNode, staticRoot) {
        var node;
        if (descNode.namespace.length !== 0) {
            node = doc.createElement(descNode.name);
        }
        else {
            node = doc.createElementNS(descNode.namespace, descNode.name);
        }
        return node;
    },
};
/*
* JSONPatchTree handles a general case algorithm with a simplified steps for handling
* tree patching and updating for a giving live node with that of a JSON description of
* giving node changes.
*
* JSONPatchTree works with a whole DOM node or a DOM fragment, in that we mean a complete
* set of DOM nodes for both the old and new set, which matches the children to be updated.
* The idea is when using this, you provide the static node where old nodes are mounted
* and you use the JSON fragment to power the update.
*
* Consider using JSONPartialPatchTree to use a more stream or partial friendly update mechanism
* which allows updating sparse parts of the DOM trees.
*
* Note: This function assumes the oldNodeOrMount for the initial call is either empty or
* contains previously rendered nodes only. That is there exists no static nodes within, as
* anything not matching the update will be removed after reconciliation.
*
* IMPORTANT: The ID value of a DOM node is very important in this algorithm, as JSONNode.id
* value will be used to query the parent for the target node. if a giving node's id is not found
* then an attempt is made with the Ancestor ID (JSONNode.aid), if it fails, then the node is created
* and swapped with whatever node is found in that position.
*
* @param fragment: A JSONNode fragment which will be used for DOM update.
* @param mountOrLastParentNode: A static node or last parent node which holds the target node for the giving JSON fragment.
* @param dictator: Dictator helps us decide if the node is the same or changed.
* @param maker: Maker helps create a real DOM node from a JSONNode.
* @param isChildRecursion: A bool which tells the patch algorithm that it is comparing inner nodes of roots.
* @return
**/
function JSONPatchTree(fragment, mountOrLastParentNode, dictator, maker) {
}
exports.JSONPatchTree = JSONPatchTree;
// JSONPartialPatchTree provides a change stream like patching mechanism which uses a array of incoming JSONNode changes
// which arrangements have no connected correlation to the actual dom but will be treated as individual change stream which
// will be used to locate the specific elements referenced by using their JSONNode.ref for tracking and update.
function JSONPartialPatchTree(fragment, mountOrLastParentNode, dictator, maker) {
}
exports.JSONPartialPatchTree = JSONPartialPatchTree;
/*
* PatchTree handles a general case algorithm with a simplified steps for handling
* tree patching and updating for a giving live node with that of new node loaded
* into a document fragment.
*
* PatchTree works with a whole DOM node or a DOM fragment, in that we mean a complete
* set of DOM nodes for both the old and new set, which matches the children to be updated.
* The idea is when using this, you get the giving static node where old nodes are mounted
* and you use a document fragment containing nodes changes for the new-fragment on the
* initial call.
*
* Consider using PartialPatchTree to use a more stream or partial friendly update mechanism
* which allows updating sparse parts of the DOM trees.
*
* Note: This function assumes the oldNodeOrMount for the initial call is either empty or
* contains previously rendered nodes only. That is there exists no static nodes within, as
* anything not matching the update will be removed after reconciliation.
*
* @param newFragment: A DOMFragment or DOM node which will be used for replacement.
* @param oldNodeOrMount: A static node or child node which holds the previous DOM tree.
* @param dictator: Dictator helps us decide if the node is the same or changed.
* @param isChildRecursion: A bool which tells the patch algorithm that it is comparing inner nodes of roots.
* @return
**/
function PatchTree(newFragment, oldNodeOrMount, dictator, isChildRecursion) {
    if (isChildRecursion) {
        var rootNode = oldNodeOrMount.parentNode;
        // if we are dealing with de-similar nodes, then we swap giving nodes
        // instead of dealing with unmatched behaviours.
        if (!dictator.Same(oldNodeOrMount, newFragment)) {
            dom.replaceNode(rootNode, oldNodeOrMount, newFragment);
            return null;
        }
        // if its not the same, then we are dealing with difference and must
        // reconcile.
        if (!oldNodeOrMount.hasChildNodes()) {
            dom.replaceNode(rootNode, oldNodeOrMount, newFragment);
            return null;
        }
    }
    var oldChildren = oldNodeOrMount.childNodes;
    var oldChildrenLength = oldChildren.length;
    var newChildren = newFragment.childNodes;
    var newChildrenLength = newChildren.length;
    var removeOldLeft = (newChildrenLength < oldChildrenLength);
    var lastIndex = 0;
    var lastNode;
    var lastNodeNextSibling;
    var newNodeHandled;
    for (; lastIndex < oldChildrenLength; lastIndex++) {
        // if we've reached the index point where the new nodes
        // parent has stopped, then break.
        if (lastIndex >= newChildrenLength) {
            break;
        }
        lastNode = oldChildren[lastIndex];
        newNodeHandled = newChildren[lastIndex];
        lastNodeNextSibling = lastNode.nextSibling;
        // if giving nodes are not the same, then replace them,
        // possible case is we are dealing with different node
        // types entirely.
        if (!dictator.Same(lastNode, newNodeHandled)) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        // if there was no actual change between nodes, then
        // skip this node and it's children as we see no reason
        // to go further down the rabbit hole.
        if (!dictator.Changed(lastNode, newNodeHandled)) {
            continue;
        }
        // Since they are the same type or node, we check content if text and verify
        // contents do not match, update and continue.
        if (lastNode.nodeType == dom.TEXT_NODE || lastNode.nodeType == dom.COMMENT_NODE) {
            if (lastNode.textContent != newNodeHandled.textContent) {
                lastNode.textContent = newNodeHandled.textContent;
            }
            continue;
        }
        // if this giving node has no children but the new one has, no need
        // bothering to do attribute checks, just replace node.
        if (!lastNode.hasChildNodes() && newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        // if old node has kids but we do not have children, then replace
        // no-need for further checks.
        if (lastNode.hasChildNodes() && !newNodeHandled.hasChildNodes()) {
            dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
            continue;
        }
        var lastElement = lastNode;
        var newElement = newNodeHandled;
        // PatchAttributes of giving element.
        PatchAttributes(newElement, lastElement);
        // Add new attribute that says we've patched this already.
        lastElement.setAttribute("_patched", "true");
        // Run Patching down the node set for giving element kids.
        PatchTree(newElement, lastElement, dictator, true);
        // Remove patched attribute that says we've patched this already.
        lastElement.removeAttribute("_patched");
    }
    // if we are to remove all children nodes from the old parent here.
    if (removeOldLeft && lastNodeNextSibling !== null) {
        dom.removeFromNode(lastNodeNextSibling, null);
        return null;
    }
    // Since we got here, it means the the new fragment has more children
    // than the parent.
    for (; lastIndex < newChildrenLength; lastIndex++) {
        var newNode = newChildren[lastIndex];
        oldNodeOrMount.appendChild(newNode);
    }
}
exports.PatchTree = PatchTree;
// PatchAttributes runs the underline process to patch giving attributes
// of two elements.
function PatchAttributes(newElement, oldElement) {
    var oldNodeAttrs = dom.recordAttributes(oldElement);
    for (var index in newElement.attributes) {
        var attr = newElement.attributes[index];
        var oldValue = oldNodeAttrs[attr.name];
        // delete attribute from oldNodeAttr map.
        // Any attribute left in this map are ones
        // the new node has no use of anymore, so
        // we gotta remove it.
        delete oldNodeAttrs[attr.name];
        // if the value is the same, skip it.
        if (attr.value === oldValue) {
            continue;
        }
        // get attribute and apply to giving node.
        oldElement.setAttribute(attr.name, attr.value);
    }
    // Remove all attributes left in this map.
    // New node did not update them, so we can remove them.
    for (var index in oldNodeAttrs) {
        oldElement.removeAttribute(index);
    }
}
exports.PatchAttributes = PatchAttributes;
