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
    function isNullOrUndefined(elem) {
        return elem === null || elem === undefined;
    }
    Objects.isNullOrUndefined = isNullOrUndefined;
    function isAny(elem, ...values) {
        for (let index of values) {
            if (elem === index) {
                return true;
            }
        }
        return false;
    }
    Objects.isAny = isAny;
})(Objects = exports.Objects || (exports.Objects = {}));
//# sourceMappingURL=extensions.js.map