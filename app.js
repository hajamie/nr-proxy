/*
 * TODO * 
   * Figure out why Google says it's not listening on the PORT env var. And why the _ah/start request gets a 426 response
   * Authentication
   * Multi user (initially websocket provides ID, html request requires the ID)
   * Google actions. Generic and smart home.  Oauth?
   * Proxy HTTP over websocket
   * Create websocket server for HTTP.  Create Docker image. 
   * Organise better. Initially, 
     - controllers.js
     - util.js
     - middlewares.js
     - routes.js? Combine with controllers for now?
     - public/?
     - tests.js
   * Move more things to templates?
   * Add tests
   * Implement debug module
   * 
   * 
   * ...
   * Rate limiting, user accounts...
   * 
*/

// Environment variables. 
console.log('Environment variables for "' + process.env.GOOGLE_CLOUD_PROJECT + '". Env: "' + process.env.NODE_ENV + '". Port: "' + process.env.PORT + '"');
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'unknown';
console.log('Starting ' + GOOGLE_CLOUD_PROJECT + '. Env: ' + NODE_ENV + '. Port: ' + PORT);

// Enable App Engine debugging. 
if (NODE_ENV === 'production') {
  require('@google-cloud/debug-agent').start();
}
const express = require('express');
const exphbs  = require('express-handlebars');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.Server(app);
const wss = new WebSocket.Server({
  server: server,
  autoAcceptConnections: false,
  clientTracking: true
});

// Use Handlebars for templates. 
app.engine('.hbs', exphbs({extname: '.hbs', defaultLayout: 'main'}));
app.set('view engine', '.hbs');


// Main entrypoint. HTTP -> HTTPS. 
app.use(function(req, res, next) {
  var schema = (req.headers['x-forwarded-proto'] || '').toLowerCase();
  console.log('HTTP received request for "' + req.url + '". Schema: ' + schema);
  if (NODE_ENV === 'production' && schema !== 'https') {
    res.redirect('https://' + req.hostname + req.url);
    return;
  }
  next();
});
// Index. 
app.get('/', function (req, res) {
  res.render('index');
});
// Startup request from GAE for manual scaling.  Ignored.  
app.get('/_ah/start', function (req, res) {
  res.end();
});
// Events. 
app.use('/event', (req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      res.status(400).json({error: "Couldn't parse request"});
      return;
    }
    next();
  });
});
app.post('/event', function (req, res) {
  var data = req.body;
  console.log('HTTP event request:');
  console.log(data);
  if (!data.event) {
    res.status(400).json({error: 'Not an event'});
    return;
  }
  console.log('HTTP event: ' + data.event);
  console.log('WSS clients: ' + wss.clients.size);
  // Send the event to clients. 
  wss.clients.forEach(function each(client) {
    client.send(JSON.stringify({"event": data.event}));
  });
  res.json('success');
});

// Websockets. 
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
  logClient(ws, 'Connected. Protocol: "' + ws.protocol + '". Extensions: "' + ws.extensions + '". Ready state: "' + ws.readyState + '". URL: "' + ws.url + '"');
});

wss.on('error', function(error) {
  console.log('WSS ERROR: ' + error);
});

wss.on('close', function(close) {
  console.log('WSS close: ' + close);
});

// Detect broken ws connections. 
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

// Start server. 
server.listen(PORT, function () {
  console.log('Server started on port ' + server.address().port);
});

// Helper functions. 
function noop() {}
function logClient(ws, message) {
  console.log('Client ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort + ' ' + message);
}