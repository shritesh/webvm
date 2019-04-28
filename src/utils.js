"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hasOwnProperty = Object.prototype.hasOwnProperty;
function Blank() { }
exports.Blank = Blank;
Blank.prototype = Object.create(null);
function has(map, property) {
    return hasOwnProperty.call(map, property);
}
exports.has = has;
function createMap() {
    return new Blank();
}
exports.createMap = createMap;
function truncateArray(arr, length) {
    while (arr.length > length) {
        arr.pop();
    }
}
exports.truncateArray = truncateArray;
function decodeFormBody(body) {
    let form = new FormData();
    body
        .trim()
        .split('&')
        .forEach(function (bytes) {
        if (bytes) {
            let split = bytes.split('=');
            let name = split.shift().replace(/\+/g, ' ');
            let value = split.join('=').replace(/\+/g, ' ');
            form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
    });
    return form;
}
exports.decodeFormBody = decodeFormBody;
function parseHTTPHeaders(rawHeaders) {
    let headers = new Headers();
    let preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function (line) {
        let parts = line.split(':');
        let key = parts.shift().trim();
        if (key) {
            let value = parts.join(':').trim();
            headers.append(key, value);
        }
    });
    return headers;
}
exports.parseHTTPHeaders = parseHTTPHeaders;
function fileReaderReady(reader) {
    return new Promise(function (resolve, reject) {
        reader.onload = function () {
            resolve(reader.result);
        };
        reader.onerror = function () {
            reject(reader.error);
        };
    });
}
exports.fileReaderReady = fileReaderReady;
function readBlobAsArrayBuffer(blob) {
    let reader = new FileReader();
    let promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise;
}
exports.readBlobAsArrayBuffer = readBlobAsArrayBuffer;
function readBlobAsText(blob) {
    let reader = new FileReader();
    let promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise;
}
exports.readBlobAsText = readBlobAsText;
function readArrayBufferAsText(buf) {
    let view = new Uint8Array(buf);
    let chars = new Array(view.length);
    for (let i = 0; i < view.length; i++) {
        chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('');
}
exports.readArrayBufferAsText = readArrayBufferAsText;
function bufferClone(buf) {
    if (buf.slice) {
        return buf.slice(0);
    }
    else {
        let view = new Uint8Array(buf.byteLength);
        view.set(new Uint8Array(buf));
        return view.buffer;
    }
}
exports.bufferClone = bufferClone;
//# sourceMappingURL=utils.js.map