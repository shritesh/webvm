"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Objects;
(function (Objects) {
    function PatchWith(elem, attrName, attrs) {
        elem[attrName] = attrs;
    }
    Objects.PatchWith = PatchWith;
    function GetAttrWith(elem, attrName) {
        return elem[attrName];
    }
    Objects.GetAttrWith = GetAttrWith;
})(Objects = exports.Objects || (exports.Objects = {}));
//# sourceMappingURL=extensions.js.map