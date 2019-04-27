
/* DOMMount exists to provide a focus DOM operation on a giving underline static node,
*  which will be used for mounting an ever updating series of changes, nodes and html elements.
* It acts as the bridge for event management, propagation and update, just like in react, the mount
* node will be where your components are rendered.
*
* Static node means a DOM node never to be removed, changed by other scripts, it was added by
* html text within original html file)
*
*/
export class DOMMount{
	public readonly doc: Document;
	public readonly mountNode: Element;
	
	constructor(document: Document,target: string|Element){
		this.doc = document;
		
		// if it's a string, then attempt using of document.querySelector
		if(typeof target === 'string'){
			const targetSelector = target as string;
			const node: Element = this.doc.querySelector(targetSelector)!;
			if(node === null || node === undefined){
				throw new Error(`unable to locate node for ${{targetSelector}}`)
			}
			
			this.mountNode = node;
			return;
		}
		
		this.mountNode = target as Element;
	}
}

