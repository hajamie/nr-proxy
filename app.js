// Environment variables. 
console.log('Environment variables for "' + process.env.GOOGLE_CLOUD_PROJECT + '". Env: "' + process.env.NODE_ENV + '". Port: "' + process.env.PORT + '"');
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'test';
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'unknown';
console.log('Starting ' + GOOGLE_CLOUD_PROJECT + '. Env: ' + NODE_ENV + '. Port: ' + PORT);

// Enable App Engine debugging. 
if (NODE_ENV === 'production') {
  require('@google-cloud/debug-agent').start();
}
const WebSocket = require('ws');
const http = require('http');


// Handle HTTP. 
var server = http.createServer(function (request, response) {
  // Startup request from GAE for manual scaling.  Ignored.  
  if (request.url == '/_ah/start') {
    response.writeHead(200);
    response.end();
    return;
  }
  
  var schema = (request.headers['x-forwarded-proto'] || '').toLowerCase();
  console.log('HTTP received request for ' + request.url + '. Schema: ' + schema);
  
  // Redirect to https on production. 
  if (NODE_ENV === 'production' && schema !== 'https') {
    response.writeHead(302, {'Location': 'https://' + request.headers.host + request.url});
    response.end();
    return;
  }
  
  // Handle event requests. 
  if (request.url == '/event' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => {body += chunk.toString();});
    request.on('end', () => {
      try {
        var data = JSON.parse(body);
      } catch(e) {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end("Couldn't parse request");
      }
      if (!data.event) {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end("Not an event");
      }
      console.log('HTTP event: ' + data.event);
      console.log('WSS clients: ' + wss.clients.size);
      // Send the event to clients. 
      wss.clients.forEach(function each(client) {
        client.send(JSON.stringify({"event": data.event}));
      });
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end(JSON.stringify({event: 'success'}));
    });
  } else {
    // Respond to everything else. 
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write("I'm listening\n\n");
    response.end("...\n");
  }
});

server.listen(PORT, function () {
  console.log('HTTP server is listening on port ' + PORT);
});

// Handle websockets once the http server is listening. 
console.log('WSS setting up socket on ' + PORT);
wss = new WebSocket.Server({
  server: server,
  autoAcceptConnections: false,
  clientTracking: true
});
console.log('WSS socket listening on ' + PORT);

wss.on('connection', function connection(ws) {
  // Log incoming messages. TODO: more functionality. 
  ws.on('message', function(message) {
    logClient(ws, 'Received message: ' + message);
  });
  // Logging other events. 
  ws.on('close', function(code, reason) {
    logClient(ws, 'Closed. Code: ' + code + '. Reason: ' + reason);
  });
  ws.on('error', function(error) {
    logClient(ws, 'Error: ' + error);
  });
  ws.on('unexpected-response', function(request, response) {
    logClient(ws, 'unexpected-response');
  });
  ws.on('upgrade', function(response) {
    logClient(ws, 'upgrade');
  });
  // Keep track of live connections. 
  ws.isAlive = true;
  ws.on('pong', function(){this.isAlive = true});
  // Respond on connection. 
  ws.send(JSON.stringify({"status": "Connected"}));
});

wss.on('error', function(error) {
  console.log('WSS ERROR: ' + error);
});

wss.on('close', function(close) {
  console.log('WSS close: ' + close);
});

// Detect broken connections. 
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      logClient(ws, 'died. Terminating connection')
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

function noop() {}
function logClient(ws, message) {
  console.log('Client ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort + ' ' + message);
}