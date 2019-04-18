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


// /**
//  * Changes to the first child of the current node.
//  */
// function enterNode() {
//   currentParent = currentNode;
//   currentNode = null;
// }


// /**
//  * @return The next Node to be patched.
//  */
// function getNextNode(): Node|null {
//   if (currentNode) {
//     return currentNode.nextSibling;
//   } else {
//     return currentParent!.firstChild;
//   }
// }


// /**
//  * Changes to the next sibling of the current node.
//  */
// function nextNode() {
//   currentNode = getNextNode();
// }


// /**
//  * Changes to the parent of the current node, removing any unvisited children.
//  */
// function exitNode() {
//   clearUnvisitedDOM(currentParent, getNextNode(), null);

//   currentNode = currentParent;
//   currentParent = currentParent!.parentNode;
// }


// /**
//  * Makes sure that the current node is an Element with a matching nameOrCtor and
//  * key.
//  *
//  * @param nameOrCtor The tag or constructor for the Element.
//  * @param key The key used to identify this element. This can be an
//  *     empty string, but performance may be better if a unique value is used
//  *     when iterating over an array of items.
//  * @return The corresponding Element.
//  */
// function open(nameOrCtor: NameOrCtorDef, key?: Key): HTMLElement {
//   alignWithDOM(nameOrCtor, key);
//   enterNode();
//   return (currentParent as HTMLElement);
// }


// /**
//  * Closes the currently open Element, removing any unvisited children if
//  * necessary.
//  */
// function close() {
//   if (DEBUG) {
//     setInSkip(false);
//   }

//   exitNode();
//   return (currentNode) as Element;
// }


// /**
//  * Makes sure the current node is a Text node and creates a Text node if it is
//  * not.
//  */
// function text(): Text {
//   alignWithDOM('#text', null);
//   return (currentNode) as Text;
// }


// /**
//  * Gets the current Element being patched.
//  */
// function currentElement(): HTMLElement {
//   if (DEBUG) {
//     assertInPatch('currentElement', doc!);
//     assertNotInAttributes('currentElement');
//   }
//   return (currentParent) as HTMLElement;
// }


// /**
//  * @return The Node that will be evaluated for the next instruction.
//  */
// function currentPointer(): Node {
//   if (DEBUG) {
//     assertInPatch('currentPointer', doc!);
//     assertNotInAttributes('currentPointer');
//   }
//   // TODO(tomnguyen): assert that this is not null
//   return getNextNode()!;
// }


// /**
//  * Skips the children in a subtree, allowing an Element to be closed without
//  * clearing out the children.
//  */
// function skip() {
//   if (DEBUG) {
//     assertNoChildrenDeclaredYet('skip', currentNode);
//     setInSkip(true);
//   }
//   currentNode = currentParent!.lastChild;
// }

// /**
//  * The offset in the virtual element declaration where the attributes are
//  * specified.
//  */
// const ATTRIBUTES_OFFSET = 3;


// /**
//  * Used to keep track of the previous values when a 2-way diff is necessary.
//  * This object is reused.
//  * TODO(sparhamI) Scope this to a patch so you can call patch from an attribute
//  * update.
//  */
// const prevAttrsMap = createMap();


// /**
//  * Applies the statics. When importing an Element, any existing attributes that
//  * match a static are converted into a static attribute.
//  * @param node The Element to apply statics for.
//  * @param data The Element's data
//  * @param statics The statics array,
//  */
// function applyStatics(node: HTMLElement, data: NodeData, statics: Statics) {
//   data.staticsApplied = true;

//   if (!statics || !statics.length) {
//     return;
//   }

//   if (data.hasEmptyAttrsArr()) {
//     for (let i = 0; i < statics.length; i += 2) {
//       updateAttribute(node, statics[i] as string, statics[i + 1]);
//     }
//     return;
//   }

//   for (let i = 0; i < statics.length; i += 2) {
//     prevAttrsMap[statics[i] as string] = i + 1;
//   }

//   const attrsArr = data.getAttrsArr(0);
//   let j = 0;
//   for (let i = 0; i < attrsArr.length; i += 2) {
//     const name = attrsArr[i];
//     const value = attrsArr[i + 1];
//     const staticsIndex = prevAttrsMap[name];

//     if (staticsIndex) {
//       // For any attrs that are static and have the same value, make sure we do
//       // not set them again.
//       if (statics[staticsIndex] === value) {
//         delete prevAttrsMap[name];
//       }

//       continue;
//     }

//     // For any attrs that are dynamic, move them up to the right place.
//     attrsArr[j] = name;
//     attrsArr[j + 1] = value;
//     j += 2;
//   }
//   // Anything after `j` was either moved up already or static.
//   truncateArray(attrsArr, j);

//   for (const name in prevAttrsMap) {
//     updateAttribute(node, name, statics[prevAttrsMap[name]]);
//     delete prevAttrsMap[name];
//   }
// }


// /**
//  * @param  nameOrCtor The Element's tag or constructor.
//  * @param  key The key used to identify this element. This can be an
//  *     empty string, but performance may be better if a unique value is used
//  *     when iterating over an array of items.
//  * @param statics An array of attribute name/value pairs of the static
//  *     attributes for the Element. Attributes will only be set once when the
//  *     Element is created.
//  * @param varArgs, Attribute name/value pairs of the dynamic attributes
//  *     for the Element.
//  * @return The corresponding Element.
//  */
// function elementOpen(
//     nameOrCtor: NameOrCtorDef, key?: Key,
//     // Ideally we could tag statics and varArgs as an array where every odd
//     // element is a string and every even element is any, but this is hard.
//     // tslint:disable-next-line:no-any
//     statics?: Statics, ...varArgs: any[]) {
//   if (DEBUG) {
//     assertNotInAttributes('elementOpen');
//     assertNotInSkip('elementOpen');
//   }

//   const node = open(nameOrCtor, key);
//   const data = getData(node);

//   if (!data.staticsApplied) {
//     applyStatics(node, data, statics);
//   }

//   const attrsLength = Math.max(0, arguments.length - ATTRIBUTES_OFFSET);
//   const hadNoAttrs = data.hasEmptyAttrsArr();

//   if (!attrsLength && hadNoAttrs) {
//     return node;
//   }

//   const attrsArr = data.getAttrsArr(attrsLength);

//   /*
//    * Checks to see if one or more attributes have changed for a given Element.
//    * When no attributes have changed, this is much faster than checking each
//    * individual argument. When attributes have changed, the overhead of this is
//    * minimal.
//    */
//   let i = ATTRIBUTES_OFFSET;
//   let j = 0;

//   for (; i < arguments.length; i += 2, j += 2) {
//     const name = arguments[i];
//     if (hadNoAttrs) {
//       attrsArr[j] = name;
//     } else if (attrsArr[j] !== name) {
//       break;
//     }

//     const value = arguments[i + 1];
//     if (hadNoAttrs || attrsArr[j + 1] !== value) {
//       attrsArr[j + 1] = value;
//       updateAttribute(node, name, value);
//     }
//   }

//   /*
//    * Items did not line up exactly as before, need to make sure old items are
//    * removed. This can happen if using conditional logic when declaring
//    * attrs through the elementOpenStart flow or if one element is reused in
//    * the place of another.
//    */
//   if (i < arguments.length || j < attrsArr.length) {
//     const attrsStart = j;

//     for (; j < attrsArr.length; j += 2) {
//       prevAttrsMap[attrsArr[j]] = attrsArr[j + 1];
//     }

//     for (j = attrsStart; i < arguments.length; i += 2, j += 2) {
//       const name = arguments[i];
//       const value = arguments[i + 1];

//       if (prevAttrsMap[name] !== value) {
//         updateAttribute(node, name, value);
//       }

//       attrsArr[j] = name;
//       attrsArr[j + 1] = value;

//       delete prevAttrsMap[name];
//     }

//     truncateArray(attrsArr, j);

//     /*
//      * At this point, only have attributes that were present before, but have
//      * been removed.
//      */
//     for (const name in prevAttrsMap) {
//       updateAttribute(node, name, undefined);
//       delete prevAttrsMap[name];
//     }
//   }

//   return node;
// }


// /**
//  * Declares a virtual Element at the current location in the document. This
//  * corresponds to an opening tag and a elementClose tag is required. This is
//  * like elementOpen, but the attributes are defined using the attr function
//  * rather than being passed as arguments. Must be folllowed by 0 or more calls
//  * to attr, then a call to elementOpenEnd.
//  * @param nameOrCtor The Element's tag or constructor.
//  * @param key The key used to identify this element. This can be an
//  *     empty string, but performance may be better if a unique value is used
//  *     when iterating over an array of items.
//  * @param statics An array of attribute name/value pairs of the static
//  *     attributes for the Element. Attributes will only be set once when the
//  *     Element is created.
//  */
// function elementOpenStart(
//   nameOrCtor: NameOrCtorDef, key?: Key, statics?: Statics) {
//   const argsBuilder = getArgsBuilder();

//   if (DEBUG) {
//     assertNotInAttributes('elementOpenStart');
//     setInAttributes(true);
//   }

//   argsBuilder[0] = nameOrCtor;
//   argsBuilder[1] = key;
//   argsBuilder[2] = statics;
// }


// /**
//  * Allows you to define a key after an elementOpenStart. This is useful in
//  * templates that define key after an element has been opened ie
//  * `<div key('foo')></div>`.
//  */
// function key(key:string) {
//   const argsBuilder = getArgsBuilder();

//   if (DEBUG) {
//     assertInAttributes('key');
//     assert(argsBuilder);
//   }
//   argsBuilder[1] = key;
// }


// /***
//  * Defines a virtual attribute at this point of the DOM. This is only valid
//  * when called between elementOpenStart and elementOpenEnd.
//  */
// // tslint:disable-next-line:no-any
// function attr(name: string, value: any) {
//   const argsBuilder = getArgsBuilder();

//   if (DEBUG) {
//     assertInAttributes('attr');
//   }

//   argsBuilder.push(name);
//   argsBuilder.push(value);
// }


// /**
//  * Closes an open tag started with elementOpenStart.
//  * @return The corresponding Element.
//  */
// function elementOpenEnd(): HTMLElement {
//   const argsBuilder = getArgsBuilder();

//   if (DEBUG) {
//     assertInAttributes('elementOpenEnd');
//     setInAttributes(false);
//   }

//   assert(argsBuilder);
//   const node = elementOpen.apply(null, argsBuilder!);
//   truncateArray(argsBuilder, 0);
//   return node;
// }


// /**
//  * Closes an open virtual Element.
//  *
//  * @param nameOrCtor The Element's tag or constructor.
//  * @return The corresponding Element.
//  */
// function elementClose(nameOrCtor: NameOrCtorDef): Element {
//   if (DEBUG) {
//     assertNotInAttributes('elementClose');
//   }

//   const node = close();

//   if (DEBUG) {
//     assertCloseMatchesOpenTag(getData(node).nameOrCtor, nameOrCtor);
//   }

//   return node;
// }


// /**
//  * Declares a virtual Element at the current location in the document that has
//  * no children.
//  * @param nameOrCtor The Element's tag or constructor.
//  * @param key The key used to identify this element. This can be an
//  *     empty string, but performance may be better if a unique value is used
//  *     when iterating over an array of items.
//  * @param statics An array of attribute name/value pairs of the static
//  *     attributes for the Element. Attributes will only be set once when the
//  *     Element is created.
//  * @param varArgs Attribute name/value pairs of the dynamic attributes
//  *     for the Element.
//  * @return The corresponding Element.
//  */
// function elementVoid(
//     nameOrCtor: NameOrCtorDef, key?: Key,
//     // Ideally we could tag statics and varArgs as an array where every odd
//     // element is a string and every even element is any, but this is hard.
//     // tslint:disable-next-line:no-any
//     statics?: Statics, ...varArgs: any[]) {
//   elementOpen.apply(null, arguments);
//   return elementClose(nameOrCtor);
// }

// /**
//  * Declares a virtual Text at this point in the document.
//  *
//  * @param value The value of the Text.
//  * @param varArgs
//  *     Functions to format the value which are called only when the value has
//  *     changed.
//  * @return The corresponding text node.
//  */
// function text(value: string|number|boolean, ...varArgs: Array<(a: {}) => string>) {
//   if (DEBUG) {
//     assertNotInAttributes('text');
//     assertNotInSkip('text');
//   }

//   const node = coreText();
//   const data = getData(node);

//   if (data.text !== value) {
//     data.text = (value) as string;

//     let formatted = value;
//     for (let i = 1; i < arguments.length; i += 1) {
//       /*
//        * Call the formatter function directly to prevent leaking arguments.
//        * https://github.com/google/incremental-dom/pull/204#issuecomment-178223574
//        */
//       const fn = arguments[i];
//       formatted = fn(formatted);
//     }

//     node.data = formatted as string;
//   }

//   return node;
// }


// /** */
// export {
//   elementOpenStart,
//   elementOpenEnd,
//   elementOpen,
//   elementVoid,
//   elementClose,
//   text,
//   attr,
//   key,
// };
