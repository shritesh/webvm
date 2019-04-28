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
export function truncateArray(arr: Array<{} | null | undefined>, length: number) {
  while (arr.length > length) {
    arr.pop();
  }
}

export function decodeFormBody(body) {
  let form = new FormData();
  body
    .trim()
    .split('&')
    .forEach(function(bytes) {
      if (bytes) {
        let split = bytes.split('=');
        let name = split.shift().replace(/\+/g, ' ');
        let value = split.join('=').replace(/\+/g, ' ');
        form.append(decodeURIComponent(name), decodeURIComponent(value));
      }
    });
  return form;
}

export function parseHTTPHeaders(rawHeaders) {
  let headers = new Headers();
  // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
  // https://tools.ietf.org/html/rfc7230#section-3.2;
  let preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
  preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
    let parts = line.split(':');
    let key = parts.shift().trim();
    if (key) {
      let value = parts.join(':').trim();
      headers.append(key, value);
    }
  });
  return headers;
}

export function fileReaderReady(reader) {
  return new Promise(function(resolve, reject) {
    reader.onload = function() {
      resolve(reader.result);
    };
    reader.onerror = function() {
      reject(reader.error);
    };
  });
}

export function readBlobAsArrayBuffer(blob) {
  let reader = new FileReader();
  let promise = fileReaderReady(reader);
  reader.readAsArrayBuffer(blob);
  return promise;
}

export function readBlobAsText(blob) {
  let reader = new FileReader();
  let promise = fileReaderReady(reader);
  reader.readAsText(blob);
  return promise;
}

export function readArrayBufferAsText(buf) {
  let view = new Uint8Array(buf);
  let chars = new Array(view.length);

  for (let i = 0; i < view.length; i++) {
    chars[i] = String.fromCharCode(view[i]);
  }
  return chars.join('');
}

export function bufferClone(buf) {
  if (buf.slice) {
    return buf.slice(0);
  } else {
    let view = new Uint8Array(buf.byteLength);
    view.set(new Uint8Array(buf));
    return view.buffer;
  }
}
