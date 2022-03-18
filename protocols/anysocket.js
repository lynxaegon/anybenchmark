const ProtocolBase = require("./base");
let AnySocket = require('anysocket');

module.exports = class WSProtocol extends ProtocolBase {
    constructor(url, options) {
        super(url, options)

        this.socket = new AnySocket();
        this.peer = null;
        this.socket.connect("ws", "127.0.0.1",8080).then((peer) => {
            this.peer = peer;
            this.emit("open")
        }).catch((err) => {
            this.emit("error", err);
        });
        this.socket.on("message", (packet) => {
            this.emit("message")
        });
        this.socket.on("disconnected", (peer, reason) => {
            this.emit("close")
        });
    }

    getBytesRead() {
        let internal = this.socket._socket || {};
        return internal.bytesRead || 0;
    }

    getBytesWritten() {
        let internal = this.socket._socket || {};
        return internal.bytesWritten || 0;
    }

    send(data, options) {
        this.peer.send(data).catch((err) => {
            this.emit("error", err);
        });
    }

    close() {
        if(this.peer != null) {
            this.peer.disconnect()
        }
    }
}