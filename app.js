// Enable App Engine debugging. 
require('@google-cloud/debug-agent').start();
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;



var socket = new WebSocket('ws://nr-proxy.appspot.com');
socket.setMaxListeners(0);
socket.on('open',function() {
  console.log('opened');
});
socket.on('close',function() {
  console.log('closed');
});
socket.on('message',function(data,flags) {
  console.log('Message: ' + data);
});
socket.on('error', function(err) {
  console.log('error: ' + err);
});



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
  ws.send('Connected');
});

wss.on('error', function(error) {
  console.log('ERROR: ' + error);
});