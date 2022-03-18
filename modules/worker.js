let Socket = require("../protocols/ws");

class Worker {
    constructor() {
        this.socket = null;
        this.connections = {};
        this.concurrent = 0;
        this.session = require(process.argv[2]);

        this.setupOnMessage()
    }

    setupOnMessage() {
        process.on('message', (task) => {
            let now = Date.now();

            //
            // Write a new message to the socket. The message should have a size of x
            //
            if (task.write) {
                Object.keys(this.connections).forEach((id) => {
                    this.write(this.connections[id], task, id);
                });
            }

            //
            // Shut down every single socket.
            //
            if (task.shutdown) {
                Object.keys(this.connections).forEach((id) => {
                    this.connections[id].close();
                });
            }

            // End of the line, we are gonna start generating new connections.
            if (!task.url) return;

            let socket = new Socket(task.url);

            socket.on('open', () => {
                process.send({ type: 'open', duration: Date.now() - now, id: task.id, concurrent: this.concurrent });
                this.write(socket, task, task.id);

                // As the `close` event is fired after the internal `_socket` is cleaned up
                // we need to do some hacky shit in order to tack the bytes send.
            });

            socket.on('message', (data) => {
                process.send({
                    type: 'message', latency: Date.now() - socket.last, concurrent: this.concurrent,
                    id: task.id
                });

                // Only write as long as we are allowed to send messages
                if (--task.messages) {
                    this.write(socket, task, task.id);
                } else {
                    socket.close();
                }
            });

            socket.on('close', () => {
                process.send({
                    type: 'close', id: task.id, concurrent: --this.concurrent,
                    read: socket.getBytesRead(),
                    send: socket.getBytesWritten()
                });

                delete this.connections[task.id];
            });

            socket.on('error', (err) => {
                process.send({ type: 'error', message: err.message, id: task.id, concurrent: --this.concurrent });

                socket.close();
                delete this.connections[task.id];
            });

            // Adding a new socket to our socket collection.
            ++this.concurrent;
            this.connections[task.id] = socket;
        });
    }

    /**
     * Helper function from writing messages to the socket.
     *
     * @param {WebSocket} socket WebSocket connection we should write to
     * @param {Object} task The given task
     * @param {String} id
     * @param {Function} fn The callback
     * @api private
     */
    write(socket, task, id, fn) {
        this.session[this.binary ? 'binary' : 'utf8'](task.size, (err, data) => {
            socket.last = Date.now();
            socket.send(data, {});
        });
    }
}

new Worker();