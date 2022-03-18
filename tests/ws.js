let WebSocket = require('ws')
const ws = new WebSocket.Server({ port: 8080 })

ws.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        // console.log('received: %s', data);
    });

    ws.send('something');
});