export namespace Objects {
  export function PatchWith(elem: any, attrName: string, attrs: any): void {
    elem[attrName] = attrs;
  }
  
  export function GetAttrWith(elem: any, attrName: string): any {
    return elem[attrName];
  }
}