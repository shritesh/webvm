import * as patch from './patch';
import * as utils from './utils';
import * as dom from './dom';

/**
 * DOMChange defines a type which represent a string of html, a DocumentFragment containing
 *
 */
export type DOMChange = string | DocumentFragment | patch.JSONNode;

/**
 * EventHandler defines a function interface type for handling events.
 */
export interface EventHandler {
  (e: Event): void;
}

/* DOMMount exists to provide a focus DOM operation on a giving underline static node,
 *  which will be used for mounting an ever updating series of changes, nodes and html elements.
 * It acts as the bridge for event management, propagation and update, just like in react, the mount
 * node will be where your components are rendered.
 *
 * Static node means a DOM node never to be removed, changed by other scripts, it was added by
 * html text within original html file)
 *
 */
export class DOMMount {
  public readonly doc: Document;
  public readonly mountNode: Element;
  private readonly events: utils.KeyMap;
  private readonly handler: EventHandler;

  constructor(document: Document, target: string | Element) {
    this.doc = document;
    this.events = {} as utils.KeyMap;
    this.handler = this.handleEvent.bind(this);

    // if it's a string, then attempt using of document.querySelector
    if (typeof target === 'string') {
      const targetSelector = target as string;
      const node: Element = this.doc.querySelector(targetSelector)!;
      if (node === null || node === undefined) {
        throw new Error(`unable to locate node for ${{ targetSelector }}`);
      }

      this.mountNode = node;
      return;
    }

    this.mountNode = target as Element;
  }

  handleEvent(event: Event): void {}

  /**
   * applyPatch applies a DOM Change which either is a string of html,
   * DocumentFragment containing changes or a JSON Node which represent
   * a complete DOM which will be applied to the static mount directly using
   * the dom.PatchTree. This means we expect the DOM described here to be
   * a complete change reflection for the nodes in the mount.
   *
   * It entirely relies on dom.PatchDOMTree for a DOM node and dom.PatchJSONNodeTree
   * for a JSONNode. Strings are considered html text.
   *
   * @param change the node change to be applied.
   */
  patch(change: DOMChange): void {
    if (change instanceof DocumentFragment) {
      const fragment = change as DocumentFragment;
      patch.PatchDOMTree(fragment, this.mountNode, patch.DefaultNodeDictator, false);
      this.registerNodeEvents(fragment);
      return;
    }

    if (typeof change === 'string') {
      const node = document.createElement('div');
      node.innerHTML = change as string;

      patch.PatchDOMTree(node, this.mountNode, patch.DefaultNodeDictator, false);
      this.registerNodeEvents(node);
      return;
    }

    if (!patch.isJSONNode(change)) {
      return;
    }

    const node = change as patch.JSONNode;
    patch.PatchJSONNodeTree(node, this.mountNode, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
    this.registerJSONNodeEvents(node);
  }

  /**
   * patchList applies a array of DOM changes to be applied to the mount DOM.
   * It individually calls DOMMount.patch for each change.
   *
   * @param changes is a array of DOM change.
   */
  patchList(changes: Array<DOMChange>): void {
    changes.forEach(this.patch.bind(this));
  }

  /**
   * stream applies a string which should contain a array of JSONNode which will be
   * applied to the DOMMount node using DOMMount.streamList.
   *
   * @param changes a JSON string containing a list of JSONNode items.
   */
  stream(changes: string): void {
    const nodes = JSON.parse(changes) as Array<patch.JSONNode>;
    return this.streamList(nodes);
  }

  /***
   * streamList applies a list of JSONNode changes considered as partial changes
   * with no relation to their order, each is applied independently to the DOM,
   * where each change only applies to it's target. It is unlike the DOMMount.patch
   * method which expects a complete DOM representation as previously rendered with
   * the new changes.
   *
   * This can be used to effectively remove part of the nodes which have expired or
   * add or swap nodes within specific areas of the DOM.
   *
   * It relies on the dom.StreamJSONNodes.
   *
   * @param changes is a array of JSONNodes to apply to the dom in static mount node.
   */
  streamList(changes: Array<patch.JSONNode>): void {
    patch.StreamJSONNodes(changes, this.mountNode, patch.DefaultJSONDictator, patch.DefaultJSONMaker);
    changes.forEach(this.registerJSONNodeEvents.bind(this));
  }

  registerNodeEvents(node: Node): void {
    const binder = this;
    dom.applyEachNode(node, function(n: Node): void {
      if (n.nodeType !== dom.ELEMENT_NODE) {
        return;
      }

      const elem = node as Element;
      const events = elem.getAttribute('events')!;
      events.split(' ').forEach(function(desc) {
        const order = desc.split('-');
        if (order.length === 2) {
          binder.registerEvent(order[0]);
        }
      });
    });
  }

  registerJSONNodeEvents(node: patch.JSONNode): void {
    const binder = this;
    patch.applyJSONNodeFunction(node, function(n: patch.JSONNode): void {
      if (n.removed) {
        n.events.forEach(function(desc) {
          binder.unregisterEvent(desc.Name);
        });
        return;
      }

      n.events.forEach(function(desc) {
        binder.registerEvent(desc.Name);
      });
    });
  }

  registerEvent(eventName: string): void {
    if (this.events[eventName]) {
      return;
    }

    this.mountNode!.addEventListener(eventName, this.handler, true);
    this.events[eventName] = true;
  }

  unregisterEvent(eventName: string): void {
    if (!this.events[eventName]) {
      return;
    }
    this.mountNode!.removeEventListener(eventName, this.handler, true);
    this.events[eventName] = false;
  }
}
