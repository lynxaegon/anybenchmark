const EventEmitter = require("events");
module.exports = class ProtocolBase extends EventEmitter {
    constructor(url, options) {
        super()
    }

    getBytesRead() {

    }

    getBytesWritten() {

    }

    send(data, options) {

    }

    close() {

    }
}