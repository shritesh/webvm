import * as dom from './dom';

// NodeDictator defines an interface type which exposes methods
// that operate on DOM Npdes to patch into a patchTree process allowing
// the checks of a giving node if they are the same and changed.
export interface NodeDictator {
	Same(n:Node, m:Node): boolean
	Changed(n:Node, m:Node): boolean
}

// DefaultNodeDictator implements the NodeDictator interface.
export const DefaultNodeDictator: NodeDictator = {
	Same: (n: Node, m: Node): boolean => {
		return n.nodeType == m.nodeType && n.nodeName == m.nodeName;
	},
	Changed: (n: Node, m: Node): boolean => {
		return false;
	},
};

// JSONAttr represent giving json format for a attribute for
// a giving json node.
export interface JSONAttr  {
	Key: string
	Value: any
}

// JSONEvent represent giving json format for a event for
// a giving json node.
export interface JSONEvent  {
	Name: string
	PreventDefault: boolean
	StopPropagation: boolean
}

// JSONNode defines an interface exposing the expected
// type representing a giving JSON encoded version of
// a DOM update node or request.
export interface JSONNode {
	id: string;                 // id defines the dom id attribute for giving node.
	tid: string;                // tid gives the unique id dom node.
	atid: string;               // atid tells the ancestor-id which was the reconciliation process. It tells us what the id of old node.
	ref: string;                // ref defines a reference value provided to match nodes from rendering and rendered.
	type: string;               // type tells us which type of node e.g document-fragment, text-node
	name: string;               // name tells the name of giving node e.g div, span.
	content: string;            // content represents text content if this is a content.
	namespace: string;          // namespace tells the DOM namespace for giving node.
	removed: boolean;           // removed tells us if this represents a removal JSONNode instruction.
	attrs: Array<JSONAttr>;     // attrs defines the array of node attributes.
	events: Array<JSONEvent>;   // events defines the event map for giving attribute.
	children: Array<JSONNode>;  // children contains child node descriptions for giving root.
}

/*
* JSONDictator defines an interface which exposes method to verify
* the same and change state of a DOM node and a JSON node.
*/
export interface JSONDictator {
	Same(n:Node, m:JSONNode): boolean
	Changed(n:Node, m:JSONNode): boolean
}

// DefaultJSONDictator implements the JSONDictator interface.
export const DefaultJSONDictator: JSONDictator = {
	Same: (n: Node, m: JSONNode): boolean => {
		return false;
	},
	Changed: (n: Node, m: JSONNode): boolean => {
		return false;
	},
};

// JSONMaker defines an interface which exposes a method to create
// a DOM node from a JSON node.
export interface JSONMaker {
	
	// Make will take provided JSONNode and create
	// appropriate node representation for giving json.
	//
	// @param n is the JSONNode to use.
	// @param staticRoot is a static root element in the DOM we can bind events to.
	Make(doc: Document, n: JSONNode, staticRoot: Node|null): Node
}

// DefaultJSONMaker implements the JSONMaker interface.
export const DefaultJSONMaker: JSONMaker = {
	Make: (doc: Document,descNode: JSONNode, staticRoot: Node|null): Node => {
		let node: Node;
		
		if (descNode.namespace.length !== 0){
			node = doc.createElement(descNode.name)
		}else{
			node = doc.createElementNS(descNode.namespace, descNode.name)
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
export function JSONPatchTree(fragment: JSONNode, mountOrLastParentNode: Node, dictator:JSONDictator, maker: JSONMaker){

}

// JSONPartialPatchTree provides a change stream like patching mechanism which uses a array of incoming JSONNode changes
// which arrangements have no connected correlation to the actual dom but will be treated as individual change stream which
// will be used to locate the specific elements referenced by using their JSONNode.ref for tracking and update.
export function JSONPartialPatchTree(fragment: Array<JSONNode>, mountOrLastParentNode: Node, dictator:JSONDictator, maker: JSONMaker){

}

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
export function PatchTree(newFragment: Node, oldNodeOrMount: Node, dictator:NodeDictator, isChildRecursion: boolean|false){
	if (isChildRecursion){
		const rootNode = oldNodeOrMount.parentNode;
		
		// if we are dealing with de-similar nodes, then we swap giving nodes
		// instead of dealing with unmatched behaviours.
		if (!dictator.Same(oldNodeOrMount, newFragment)){
			dom.replaceNode(rootNode!, oldNodeOrMount, newFragment);
			return null;
		}
		
		// if its not the same, then we are dealing with difference and must
		// reconcile.
		if (!oldNodeOrMount.hasChildNodes()){
			dom.replaceNode(rootNode!, oldNodeOrMount, newFragment);
			return null;
		}
	}
	
	const oldChildren = oldNodeOrMount.childNodes;
	const oldChildrenLength = oldChildren.length;
	const newChildren = newFragment.childNodes;
	const newChildrenLength = newChildren.length;
	const removeOldLeft = (newChildrenLength < oldChildrenLength);
	
	let lastIndex = 0;
	let lastNode: Node;
	let lastNodeNextSibling: Node;
	let newNodeHandled: Node;
	for (; lastIndex < oldChildrenLength; lastIndex++){
		
		// if we've reached the index point where the new nodes
		// parent has stopped, then break.
		if (lastIndex >= newChildrenLength){
			break;
		}
		
		lastNode = oldChildren[lastIndex];
		newNodeHandled = newChildren[lastIndex];
		lastNodeNextSibling = lastNode.nextSibling!;
		
		// if giving nodes are not the same, then replace them,
		// possible case is we are dealing with different node
		// types entirely.
		if (!dictator.Same(lastNode, newNodeHandled)){
			dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
			continue;
		}
		
		// if there was no actual change between nodes, then
		// skip this node and it's children as we see no reason
		// to go further down the rabbit hole.
		if (!dictator.Changed(lastNode, newNodeHandled)){
			continue;
		}
		
		// Since they are the same type or node, we check content if text and verify
		// contents do not match, update and continue.
		if (lastNode.nodeType == dom.TEXT_NODE  || lastNode.nodeType == dom.COMMENT_NODE){
			if (lastNode.textContent != newNodeHandled.textContent) {
				lastNode.textContent = newNodeHandled.textContent;
			}
			continue;
		}
		
		// if this giving node has no children but the new one has, no need
		// bothering to do attribute checks, just replace node.
		if (!lastNode.hasChildNodes() && newNodeHandled.hasChildNodes()){
			dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
			continue;
		}
		
		// if old node has kids but we do not have children, then replace
		// no-need for further checks.
		if (lastNode.hasChildNodes() && !newNodeHandled.hasChildNodes()){
			dom.replaceNode(oldNodeOrMount, lastNode, newNodeHandled);
			continue;
		}
		
		const lastElement = lastNode as Element;
		const newElement = newNodeHandled as Element;
		
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
	if (removeOldLeft && lastNodeNextSibling! !== null){
		dom.removeFromNode(lastNodeNextSibling, null);
		return null;
	}
	
	// Since we got here, it means the the new fragment has more children
	// than the parent.
	for(; lastIndex < newChildrenLength; lastIndex++){
		const newNode = newChildren[lastIndex];
		oldNodeOrMount.appendChild(newNode);
	}
}

// PatchAttributes runs the underline process to patch giving attributes
// of two elements.
export function PatchAttributes(newElement: Element, oldElement: Element){
	const oldNodeAttrs: dom.Attributes = dom.recordAttributes(oldElement!);
	
	for(let index in newElement.attributes){
		const attr = newElement.attributes[index];
		const oldValue = oldNodeAttrs[attr.name];
		
		// delete attribute from oldNodeAttr map.
		// Any attribute left in this map are ones
		// the new node has no use of anymore, so
		// we gotta remove it.
		delete oldNodeAttrs[attr.name];
		
		// if the value is the same, skip it.
		if (attr.value === oldValue){
			continue;
		}
		
		// get attribute and apply to giving node.
		oldElement.setAttribute(attr.name, attr.value);
	}
	
	// Remove all attributes left in this map.
	// New node did not update them, so we can remove them.
	for(let index in oldNodeAttrs){
		oldElement.removeAttribute(index);
	}
}


