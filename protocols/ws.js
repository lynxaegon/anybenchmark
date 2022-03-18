const ProtocolBase = require("./base");
let WebSocket = require('ws');

module.exports = class WSProtocol extends ProtocolBase {
    constructor(url, options) {
        super(url, options)

        this.socket = new WebSocket(url, options);
        this.socket.on("open", (...args) => {
            this.emit("open", ...args)
        });
        this.socket.on("close", (...args) => {
            this.emit("close", ...args)
        });
        this.socket.on("error", (...args) => {
            this.emit("error", ...args)
        });
        this.socket.on("message", (...args) => {
            this.emit("message", ...args)
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
        this.socket.send(data, options, (err) => {
            if(err != null) {
                this.emit("error", err)
            }
        })
    }

    close() {
        this.socket.close()
    }
}