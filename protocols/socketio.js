const ProtocolBase = require("./base");
const { io } = require("socket.io-client");

module.exports = class WSProtocol extends ProtocolBase {
    constructor(url, options) {
        super(url, options)

        this.socket = io(url);
        this.socket.on("connect", () => {
            this.emit("open")
        })
        this.socket.on("message", (msg) => {
            this.emit("message")
        });
        this.socket.on("error", (err) => {
            this.emit("error", err)
        });
        this.socket.on("disconnect", () => {
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
        this.socket.emit("message", data);
    }

    close() {
        this.socket.disconnect()
    }
}