// Environment variables. 
console.log('Environment variables for "' + process.env.GOOGLE_CLOUD_PROJECT + '". Env: "' + process.env.NODE_ENV + '". Port: "' + process.env.PORT + '"');
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'test';
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'unknown';
console.log('Starting ' + GOOGLE_CLOUD_PROJECT + '. Env: ' + NODE_ENV + '. Port: ' + PORT);

// Enable App Engine debugging. 
if (NODE_ENV == 'production') {
  require('@google-cloud/debug-agent').start();
}
const WebSocket = require('ws');
const http = require('http');


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
  // Log incoming messages. TODO: more functionality. 
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
  // Logging other events. 
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
  // Keep track of live connections. 
  ws.isAlive = true;
  ws.on('pong', function(){this.isAlive = true});
  // Respond on connection. 
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

// Detect broken connections. 
function noop() {}
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);