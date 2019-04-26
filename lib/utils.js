"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A cached reference to the hasOwnProperty function.
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * A constructor function that will create blank objects.
 */
function Blank() { }
exports.Blank = Blank;
Blank.prototype = Object.create(null);
/**
 * Used to prevent property collisions between our "map" and its prototype.
 * @param map The map to check.
 * @param property The property to check.
 * @return Whether map has property.
 */
function has(map, property) {
    return hasOwnProperty.call(map, property);
}
exports.has = has;
/**
 * Creates an map object without a prototype.
 */
// tslint:disable-next-line:no-any
function createMap() {
    // tslint:disable-next-line:no-any
    return new Blank();
}
exports.createMap = createMap;
/**
 * Truncates an array, removing items up until length.
 * @param arr The array to truncate.
 * @param length The new length of the array.
 */
function truncateArray(arr, length) {
    while (arr.length > length) {
        arr.pop();
    }
}
exports.truncateArray = truncateArray;
