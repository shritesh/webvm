/**
 * A cached reference to the hasOwnProperty function.
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * A constructor function that will create blank objects.
 */
export function Blank() {}
Blank.prototype = Object.create(null);


/**
 * Used to prevent property collisions between our "map" and its prototype.
 * @param map The map to check.
 * @param property The property to check.
 * @return Whether map has property.
 */
export function has(map: object, property: string): boolean {
  return hasOwnProperty.call(map, property);
}

/**
 * Creates an map object without a prototype.
 */
// tslint:disable-next-line:no-any
export function createMap(): any {
  // tslint:disable-next-line:no-any
  return new (Blank as any)();
}

/**
 * Truncates an array, removing items up until length.
 * @param arr The array to truncate.
 * @param length The new length of the array.
 */
export function truncateArray(arr: Array<{}|null|undefined>, length: number) {
  while (arr.length > length) {
    arr.pop();
  }
}

