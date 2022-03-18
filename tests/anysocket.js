const AnySocket = require("anysocket");

const server = new AnySocket();
server.listen("ws", 8080);
server.on("message", (packet) => {
    packet.peer.send("hello");
});