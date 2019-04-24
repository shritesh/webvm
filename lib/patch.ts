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
	id: string;
	tid: string;
	anid: string;
	type: string;
	name: string;
	content: string;
	namespace: string;
	attrs: Array<JSONAttr>;
	events: Array<JSONEvent>;
	children: Array<JSONNode>;
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
		
		if (descNode.namespace.length != 0){
			node = doc.createElement(descNode.name)
		}else{
			node = doc.createElementNS(descNode.namespace, descNode.name)
		}
		
		return node;
	},
};

/*
* PatchTreeByJSON handles a general case algorithm with a simplified steps for handling
* tree patching and updating for a giving live node with that of a JSON description of
* giving node changes.
*
* Currently we are following the current steps:
*
* 1. Iterate a node against the giving index in the new fragment, if they match in
* type then check attributes for update else skip or update as needed. If they do not
* match in type or tag, then move this node down to the root of the old node kids, and check
* mark for deletion.
*
* 2. If parent fragment has no children, then simply swap nodes.
*
* @param JSONNode
* @param oldFragment
* @param dictator
* @return
**/
export function PatchTreeByJSON(newFragment: JSONNode, oldFragment: Node, dictator:JSONDictator, maker: JSONMaker){

}

/*
* PatchTree handles a general case algorithm with a simplified steps for handling
* tree patching and updating for a giving live node with that of new node loaded
* into a document fragment.
*
* Currently we are following the current steps:
*
* 1. Iterate a node against the giving index in the new fragment, if they match in
* type then check attributes for update else skip or update as needed. If they do not
* match in type or tag, then move this node down to the root of the old node kids, and check
* mark for deletion.
*
* 2. If parent fragment has no children, then simply swap nodes.
*
* @param newFragment
* @param oldFragment
* @param dictator
* @return
**/
export function PatchTree(newFragment: Node, oldFragment: Node, dictator:NodeDictator){
	const rootNode = oldFragment.parentNode;
	
	// if we are dealing with de-similar nodes, then we swap giving nodes
	// instead of dealing with unmatched behaviours.
	if (!dictator.Same(oldFragment, newFragment)){
		dom.replaceNode(rootNode!, oldFragment, newFragment);
		return null;
	}
	
	// if its not the same, then we are dealing with difference and must
	// reconcile.
	if (!oldFragment.hasChildNodes()){
		dom.replaceNode(rootNode!, oldFragment, newFragment);
		return null;
	}
	
	const oldChildren = oldFragment.childNodes;
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
			dom.replaceNode(oldFragment, lastNode, newNodeHandled);
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
			dom.replaceNode(oldFragment, lastNode, newNodeHandled);
			continue;
		}
		
		// if old node has kids but we do not have children, then replace
		// no-need for further checks.
		if (lastNode.hasChildNodes() && !newNodeHandled.hasChildNodes()){
			dom.replaceNode(oldFragment, lastNode, newNodeHandled);
			continue;
		}
		
		const lastElement = lastNode as Element;
		const newElement = newNodeHandled as Element;
		
		// PatchAttributes of giving element.
		PatchAttributes(newElement, lastElement);
		
		// Add new attribute that says we've patched this already.
		lastElement.setAttribute("_patched", "true");
		
		// Run Patching down the node set for giving element kids.
		PatchTree(newElement, lastElement, dictator);
		
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
		oldFragment.appendChild(newNode);
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
		if (attr.value == oldValue){
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