"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DOMMount {
    constructor(document, target) {
        this.doc = document;
        if (typeof target === 'string') {
            const targetSelector = target;
            const node = this.doc.querySelector(targetSelector);
            if (node === null || node === undefined) {
                throw new Error(`unable to locate node for ${{ targetSelector }}`);
            }
            this.mountNode = node;
            return;
        }
        this.mountNode = target;
    }
    update(changes) { }
    stream(changes) { }
}
exports.DOMMount = DOMMount;
//# sourceMappingURL=mount.js.map