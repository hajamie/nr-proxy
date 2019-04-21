// Enable App Engine debugging. 
require('@google-cloud/debug-agent').start();
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Handle HTTP. 
var server = http.createServer(function (request, response) {
  console.log('Received request for ' + request.url);
  if (request.url == '/event' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => {body += chunk.toString();});
    request.on('end', () => {
      try {
        var data = JSON.parse(body);
        if (!data.event) {
          response.writeHead(400, {'Content-Type': 'text/plain'});
          response.end("Not an event");
        }
        console.log('Event: ' + data.event);
        console.log('Clients: ' + wss.clients.size);
        // Send the event to clients. 
        wss.clients.forEach(function each(client) {
          client.send(JSON.stringify({"event": data.event}));
        });
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(JSON.stringify({event: 'success'}));
      } catch(e) {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end("Couldn't parse request");
      }
    });
  } else {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write("I'm listening\n\n");
    response.end("...\n");
  }
});

server.listen(PORT, function () {
  console.log('Server is listening on port ' + PORT);
});

// Handle websockets. 
console.log('Setting up socket on ' + PORT);
var wss = new WebSocket.Server({
  server: server,
  autoAcceptConnections: false,
  clientTracking: true
});
console.log('Socket listening on ' + PORT);

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
  ws.on('close', function incoming(code, reason) {
    logClient(ws, 'Closed. Code: ' + code + '. Reason: ' + reason);
  });
  ws.on('error', function incoming(error) {
    logClient(ws, 'Error: ' + error);
  });
  ws.on('unexpected-response', function incoming(request, response) {
    logClient(ws, 'unexpected-response');
  });
  ws.on('upgrade', function incoming(response) {
    logClient(ws, 'upgrade');
  });
  ws.send(JSON.stringify({"status": "Connected"}));
});

function logClient(ws, message) {
  console.log('Client ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort + ' ' + message);
}

wss.on('error', function(error) {
  console.log('ERROR: ' + error);
});

wss.on('close', function(close) {
  console.log('Close: ' + close);
});