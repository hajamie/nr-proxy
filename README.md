# nr-proxy
Proxy HTTP requests over to a websocket. 

  * Runs on Google App Engine (GAE)
  * Has to be in the flexible environment so that websockets can connect

## Prerequisites
  * Download the [Google Cloud SDK](https://cloud.google.com/sdk/docs/)
  * Create a project: `gcloud projects create [YOUR_PROJECT_NAME] --set-as-default`
  * Initialise app: `gcloud app create --project=[YOUR_PROJECT_NAME]`
  * [Enable billing](https://console.cloud.google.com/projectselector/billing?lang=nodejs&st=true)
  * Install [Git](https://git-scm.com/)
  * Install [Node.js](https://nodejs.org/)

## Run the proxy
```
git clone https://github.com/hajamie/nr-proxy.git
cd nr-proxy
npm install
npm run deploy
```

Take a look at http://YOUR_PROJECT_ID.appspot.com
Create a node:
```
[{"id":"b3e9242.c5b60d8","type":"websocket in","z":"ba3995de.77a128","name":"nr-proxy","server":"","client":"1da91ba0.567e24","x":80,"y":40,"wires":[[]]},{"id":"1da91ba0.567e24","type":"websocket-client","z":"","path":"http://YOUR_PROJECT_ID.appspot.com","tls":"","wholemsg":"false"}]
```

## SSL setup
HTTP is redirected to HTTPS when deployed to GAE.  
[See Google's setup instructions](https://cloud.google.com/appengine/docs/flexible/nodejs/securing-custom-domains-with-ssl)

## Useful tools
  * [WebSocket Test Client](https://chrome.google.com/webstore/detail/websocket-test-client/fgponpodhbmadfljofbimhhlengambbn) Chrome extension
  * [Postman](https://www.getpostman.com/downloads/) API Development Environment