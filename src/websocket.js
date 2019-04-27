"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneSecond = 1000;
exports.OneMinute = exports.OneSecond * 60;
class Socket {
    constructor(addr, reader, exponent, maxReconnects, maxWait) {
        this.addr = addr;
        this.socket = null;
        this.reader = reader;
        this.maxWait = maxWait;
        this.userClosed = false;
        this.exponent = exponent;
        this.disconnected = false;
        this.attemptedConnects = 0;
        this.lastWait = exports.OneSecond;
        this.maxReconnect = maxReconnects;
        this.writeBuffer = new Array();
    }
    connect() {
        if (this.socket) {
            return;
        }
        if (this.attemptedConnects >= this.maxReconnect) {
            this.reader.Exhausted(this);
            return;
        }
        const socket = new WebSocket(this.addr);
        socket.addEventListener('open', this._opened.bind(this));
        socket.addEventListener('error', this._errored.bind(this));
        socket.addEventListener('message', this._messaged.bind(this));
        socket.addEventListener('close', this._disconnected.bind(this));
        this.socket = socket;
        this.disconnected = false;
    }
    send(message) {
        if (this.disconnected) {
            this.writeBuffer.push(message);
            return;
        }
        this.socket.send(message);
    }
    reset() {
        this.attemptedConnects = 0;
        this.lastWait = exports.OneSecond;
    }
    end() {
        this.userClosed = true;
        this.reader.Closed(this);
        this.socket.close();
        this.socket = null;
    }
    _disconnected(event) {
        this.reader.Disconnected(event, this);
        this.disconnected = true;
        this.socket = null;
        if (this.userClosed) {
            return;
        }
        let nextWait = this.lastWait;
        if (this.exponent) {
            nextWait = this.exponent(nextWait);
            if (nextWait > this.maxWait) {
                nextWait = this.maxWait;
            }
        }
        setTimeout(this.connect.bind(this), nextWait);
        this.attemptedConnects++;
    }
    _opened(event) {
        this.reader.Connected(event, this);
        while (this.writeBuffer.length > 0) {
            const message = this.writeBuffer.shift();
            this.socket.send(message);
        }
    }
    _errored(event) {
        this.reader.Errored(event, this);
    }
    _messaged(event) {
        this.reader.Message(event, this);
    }
}
exports.Socket = Socket;
//# sourceMappingURL=websocket.js.map