//
// /**
//  * Keeps track of information needed to perform diffs for a given DOM node.
//  */
// export class NodeData {
//   /**
//    * An array of attribute name/value pairs, used for quickly diffing the
//    * incomming attributes to see if the DOM node's attributes need to be
//    * updated.
//    */
//   // tslint:disable-next-line:no-any
//   private _attrsArr: null|any[] = null;
//
//   /**
//    * Whether or not the statics have been applied for the node yet.
//    */
//   staticsApplied = false;
//
//   /**
//    * The key used to identify this node, used to preserve DOM nodes when they
//    * move within their parent.
//    */
//   key: Key;
//
//   text: string|undefined;
//
//   /**
//    * The nodeName or contructor for the Node.
//    */
//   readonly nameOrCtor: NameOrCtorDef;
//
//   constructor(nameOrCtor: NameOrCtorDef, key: Key, text: string|undefined) {
//     this.nameOrCtor = nameOrCtor;
//     this.key = key;
//     this.text = text;
//   }
//
//   hasEmptyAttrsArr(): boolean {
//     const attrs = this._attrsArr;
//     return !attrs || !attrs.length;
//   }
//
//   getAttrsArr(length: number): any[] {
//     return this._attrsArr || (this._attrsArr = new Array(length));
//   }
// }
//
// declare global {
//   interface Node {
//     '__incrementalDOMData': NodeData|null;
//   }
// }
//
// /**
//  * Initializes a NodeData object for a Node.
//  */
// function initData(
//     node: Node, nameOrCtor: NameOrCtorDef, key: Key, text?: string|undefined): NodeData {
//   const data = new NodeData(nameOrCtor, key, text);
//   node['__incrementalDOMData'] = data;
//   return data;
// }
//
// /**
//  * Retrieves the NodeData object for a Node, creating it if necessary.
//  */
// function getData(node: Node, key?: Key) {
//   return importSingleNode(node, key);
// }
//
// function isDataInitialized(node: Node): boolean {
//   return Boolean(node['__incrementalDOMData']);
// }
//
// function getKey(node: Node) {
//   assert(node['__incrementalDOMData']);
//   return getData(node).key;
// }
//
// /**
//  * Imports single node and its subtree, initializing caches.
//  */
// function importSingleNode(node: Node, fallbackKey?: Key) {
//   if (node['__incrementalDOMData']) {
//     return node['__incrementalDOMData']!;
//   }
//
//   const nodeName = isElement(node) ? node.localName : node.nodeName;
//   const keyAttrName = getKeyAttributeName();
//   const keyAttr = isElement(node) && keyAttrName != null ?
//       node.getAttribute(keyAttrName) : null;
//   const key = isElement(node) ? keyAttr || fallbackKey : null;
//   const text = isText(node) ? node.data : undefined;
//   const data = initData(node, nodeName!, key, text);
//
//   if (isElement(node)) {
//     recordAttributes(node, data);
//   }
//
//   return data;
// }
//
// /**
//  * Imports node and its subtree, initializing caches.
//  */
// function importNode(node: Node) {
//   importSingleNode(node);
//
//   for (let child: Node|null = node.firstChild; child; child = child.nextSibling) {
//     importNode(child);
//   }
// }
//
// /**
//  * Clears all caches from a node and all of its children.
//  */
// function clearCache(node: Node) {
//   node['__incrementalDOMData'] = null;
//
//   for (let child: Node|null = node.firstChild; child; child = child.nextSibling) {
//     clearCache(child);
//   }
// }
//
// /**
//  * Records the element's attributes.
//  * @param node The Element that may have attributes
//  * @param data The Element's data
//  */
// function recordAttributes(node: Element, data: NodeData) {
//   const attributes = node.attributes;
//   const length = attributes.length;
//   if (!length) {
//     return;
//   }
//
//   const attrsArr = data.getAttrsArr(length);
//
//   // Use a cached length. The attributes array is really a live NamedNodeMap,
//   // which exists as a DOM "Host Object" (probably as C++ code). This makes the
//   // usual constant length iteration very difficult to optimize in JITs.
//   for (let i = 0, j = 0; i < length; i += 1, j += 2) {
//     const attr = attributes[i];
//     const name = attr.name;
//     const value = attr.value;
//
//     attrsArr[j] = name;
//     attrsArr[j + 1] = value;
//   }
// }
//
//
// /**
//  * Returns a patcher function that sets up and restores a patch context,
//  * running the run function with the provided data.
//  */
// function patchFactory<T, R>(run: PatchFunction<T, R>): PatchFunction<T, R> {
//   const f: PatchFunction<T, R> = (node, fn, data) => {
//     const prevContext = context;
//     const prevDoc = doc;
//     const prevFocusPath = focusPath;
//     const prevArgsBuilder = argsBuilder;
//     const prevCurrentNode = currentNode;
//     const prevCurrentParent = currentParent;
//     let previousInAttributes = false;
//     let previousInSkip = false;

//     context = new Context();
//     doc = node.ownerDocument;
//     argsBuilder = [];
//     currentParent = node.parentNode;
//     focusPath = getFocusedPath(node, currentParent);

//     if (DEBUG) {
//       previousInAttributes = setInAttributes(false);
//       previousInSkip = setInSkip(false);
//     }

//     try {
//       const retVal = run(node, fn, data);
//       if (DEBUG) {
//         assertVirtualAttributesClosed();
//       }

//       return retVal;
//     } finally {
//       doc = prevDoc;
//       argsBuilder = prevArgsBuilder;
//       currentNode = prevCurrentNode;
//       currentParent = prevCurrentParent;
//       focusPath = prevFocusPath;
//       context.notifyChanges();

//       // Needs to be done after assertions because assertions rely on state
//       // from these methods.
//       setInAttributes(previousInAttributes);
//       setInSkip(previousInSkip);
//       context = prevContext;
//     }
//   };
//   return f;
// }


// /**
//  * Patches the document starting at node with the provided function. This
//  * function may be called during an existing patch operation.
//  */
// const patchInner = patchFactory((node, fn, data) => {
//   currentNode = node;

//   enterNode();
//   fn(data);
//   exitNode();

//   if (DEBUG) {
//     assertNoUnclosedTags(currentNode, node);
//   }

//   return node;
// });


// /**
//  * Patches an Element with the the provided function. Exactly one top level
//  * element call should be made corresponding to `node`.
//  */
// const patchOuter = patchFactory((node, fn, data) => {
//   // tslint:disable-next-line:no-any
//   const startNode = (({nextSibling: node}) as any) as Element;
//   let expectedNextNode: Node|null = null;
//   let expectedPrevNode: Node|null = null;

//   if (DEBUG) {
//     expectedNextNode = node.nextSibling;
//     expectedPrevNode = node.previousSibling;
//   }

//   currentNode = startNode;
//   fn(data);

//   if (DEBUG) {
//     assertPatchOuterHasParentNode(currentParent);
//     assertPatchElementNoExtras(
//         startNode, currentNode, expectedNextNode, expectedPrevNode);
//   }

//   if (currentParent) {
//     clearUnvisitedDOM(currentParent, getNextNode(), node.nextSibling);
//   }

//   return (startNode === currentNode) ? null : currentNode;
// });


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


// /**
//  * Creates a Node and marking it as created.
//  * @param nameOrCtor The name or constructor for the Node.
//  * @param key The key used to identify the Node.
//  * @return The newly created node.
//  */
// function createNode(nameOrCtor: NameOrCtorDef, key:Key): Node {
//   let node;

//   if (nameOrCtor === '#text') {
//     node = createText(doc!);
//   } else {
//     node = createElement(doc!, currentParent!, nameOrCtor, key);
//   }

//   context!.markCreated(node);

//   return node;
// }


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
//  * Clears out any unvisited Nodes in a given range.
//  * @param maybeParentNode
//  * @param startNode The node to start clearing from, inclusive.
//  * @param endNode The node to clear until, exclusive.
//  */
// function clearUnvisitedDOM(
//     maybeParentNode: Node|null, startNode: Node|null, endNode: Node|null) {
//   const parentNode = maybeParentNode!;
//   let child = startNode;

//   while (child !== endNode) {
//     const next = child!.nextSibling;
//     parentNode.removeChild(child!);
//     context!.markDeleted(child!);
//     child = next;
//   }
// }



