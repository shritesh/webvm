//ElementConstructorprovides
export interface ElementConstructor {new(): Element};

/**
 * Checks if the node is the root of a document. This is either a Document
 * or ShadowRoot. DocumentFragments are included for simplicity of the
 * implementation, though we only want to consider Documents or ShadowRoots.
 * @param node The node to check.
 * @return True if the node the root of a document, false otherwise.
 */
function isDocumentRoot(node: Node): node is Document|ShadowRoot {
  return node.nodeType === 11 || node.nodeType === 9;
}

/**
 * Checks if the node is an Element. This is faster than an instanceof check.
 * @param node The node to check.
 * @return Whether or not the node is an Element.
 */
function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}


/**
 * Checks if the node is a text node. This is faster than an instanceof check.
 * @param node The node to check.
 * @return Whether or not the node is a Text.
 */
function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

/**
 * @param  node The node to start at, inclusive.
 * @param  root The root ancestor to get until, exclusive.
 * @return The ancestry of DOM nodes.
 */
function getAncestry(node: Node, root: Node|null) {
  const ancestry: Node[] = [];
  let cur: Node|null = node;

  while (cur !== root) {
    const n: Node = cur!;
    ancestry.push(n);
    cur = n.parentNode;
  }

  return ancestry;
}

/**
 * return The root node of the DOM tree that contains this node.
 */
const getRootNode =
    // tslint:disable-next-line:no-any b/79476176
    (Node as any).prototype.getRootNode || function(this: Node) {
      // tslint:disable-next-line:no-unnecessary-type-assertion b/77361044
      let cur: Node|null = this as Node;
      let prev = cur;

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
function getActiveElement(node: Node): Element|null {
  const root = getRootNode.call(node);
  return isDocumentRoot(root) ? root.activeElement : null;
}


/**
 * Gets the path of nodes that contain the focused node in the same document as
 * a reference node, up until the root.
 * @param node The reference node to get the activeElement for.
 * @param root The root to get the focused path until.
 */
function getFocusedPath(node: Node, root: Node|null): Node[] {
  const activeElement = getActiveElement(node);

  if (!activeElement || !node.contains(activeElement)) {
    return [];
  }

  return getAncestry(activeElement, root);
}


/**
 * Like insertBefore, but instead instead of moving the desired node, instead
 * moves all the other nodes after.
 * @param parentNode
 * @param node
 * @param referenceNode
 */
function moveBefore(parentNode: Node, node: Node, referenceNode: Node|null) {
  const insertReferenceNode = node.nextSibling;
  let cur = referenceNode;

  while (cur !== null && cur !== node) {
    const next = cur.nextSibling;
    parentNode.insertBefore(cur, insertReferenceNode);
    cur = next;
  }
}

/**
 * Returns the namespace to use for the attribute.
 */
function getNamespace(name: string): string|undefined {
  if (name.lastIndexOf('xml:', 0) === 0) {
    return 'http://www.w3.org/XML/1998/namespace';
  }

  if (name.lastIndexOf('xlink:', 0) === 0) {
    return 'http://www.w3.org/1999/xlink';
  }

  return undefined;
}


/**
 * Applies an attribute or property to a given Element. If the value is null
 * or undefined, it is removed from the Element. Otherwise, the value is set
 * as an attribute.
 */
// tslint:disable-next-line:no-any
function applyAttr(el: Element, name: string, value: any) {
  if (value == null) {
    el.removeAttribute(name);
  } else {
    const attrNS = getNamespace(name);
    if (attrNS) {
      el.setAttributeNS(attrNS, name, String(value));
    } else {
      el.setAttribute(name, String(value));
    }
  }
}

/**
 * Applies a property to a given Element.
 */
// tslint:disable-next-line:no-any
function applyProp(el: Element, name: string, value: any) {
  // tslint:disable-next-line:no-any
  (el as any)[name] = value;
}


/**
 * Applies a value to a style declaration. Supports CSS custom properties by
 * setting properties containing a dash using CSSStyleDeclaration.setProperty.
 */
function setStyleValue(
    style: CSSStyleDeclaration, prop: string, value: string) {
  if (prop.indexOf('-') >= 0) {
    style.setProperty(prop, value);
  } else {
    // TODO(tomnguyen) Figure out why this is necessary.
    // tslint:disable-next-line:no-any
    (style as any)[prop] = value;
  }
}


/**
 * Applies a style to an Element. No vendor prefix expansion is done for
 * property names/values.
 * @param el
 * @param name The attribute's name.
 * @param  style The style to set. Either a string of css or an object
 *     containing property-value pairs.
 */
function applyStyle(
    el: HTMLElement, name: string, style: string|{[k: string]: string}) {
  if (typeof style === 'string') {
    el.style.cssText = style;
  } else {
    el.style.cssText = '';
    const elStyle = el.style;

    for (const prop in style) {
      if (has(style, prop)) {
        setStyleValue(elStyle, prop, style[prop]);
      }
    }
  }
}


/**
 * Updates a single attribute on an Element.
 * @param el
 * @param name The attribute's name.
 * @param value The attribute's value. If the value is an object or
 *     function it is set on the Element, otherwise, it is set as an HTML
 *     attribute.
 */
function applyAttributeTyped(el: HTMLElement, name: string, value: {}) {
  const type = typeof value;

  if (type === 'object' || type === 'function') {
    applyProp(el, name, value);
  } else {
    applyAttr(el, name, value);
  }
}

/**
 * A publicly mutable object to provide custom mutators for attributes.
 * NB: The result of createMap() has to be recast since closure compiler
 * will just assume attributes is "any" otherwise and throws away
 * the type annotation set by tsickle.
 */
const attributes: AttrMutatorConfig = (createMap() as AttrMutatorConfig);

// Special generic mutator that's called for any attribute that does not
// have a specific mutator.
attributes[symbols.default] = applyAttributeTyped;

attributes['style'] = applyStyle;

/**
 * Calls the appropriate attribute mutator for this attribute.
 */
function updateAttribute(
    el: HTMLElement, name: string, value: {}|null|undefined) {
  const mutator = attributes[name] || attributes[symbols.default];
  mutator(el, name, value);
}


/**
 * Gets the namespace to create an element (of a given tag) in.
 */
function getNamespaceForTag(tag: string, parent: Node|null) {
  if (tag === 'svg') {
    return 'http://www.w3.org/2000/svg';
  }
  
  if (tag === 'math') {
    return 'http://www.w3.org/1998/Math/MathML';
  }

  if (parent == null) {
    return null;
  }

  if (getData(parent).nameOrCtor === 'foreignObject') {
    return null;
  }

  return parent.namespaceURI;
}


/**
 * Creates an Element.
 * @param doc The document with which to create the Element.
 * @param nameOrCtor The tag or constructor for the Element.
 * @param key A key to identify the Element.
 * @param  typeId The type identifier for the Element.
 */
function createElement(
    doc: Document, parent: Node|null, nameOrCtor: NameOrCtorDef, key: Key)
    : Element {
  let el;

  if (typeof nameOrCtor === 'function') {
    el = new nameOrCtor();
  } else {
    const namespace = getNamespaceForTag(nameOrCtor, parent);

    if (namespace) {
      el = doc.createElementNS(namespace, nameOrCtor);
    } else {
      el = doc.createElement(nameOrCtor);
    }
  }

  initData(el, nameOrCtor, key);

  return el;
}


/**
 * Creates a Text Node.
 * @param doc The document with which to create the Element.
 * @return
 */
function createText(doc: Document) {
  const node = doc.createTextNode('');
  initData(node, '#text', null);
  return node;
}


export {
  isElement,
  isText,
  getFocusedPath,
  moveBefore,
  updateAttribute,
  applyProp,
  applyAttr,
  attributes,
  createElement,
  createText,
};
