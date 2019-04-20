const WebSocket = require('ws');

const wsPort = process.env.PORT || 80;
const wss = new WebSocket.Server({port: wsPort});
console.log('Socket listening on ' + wsPort);

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});