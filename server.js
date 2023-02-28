require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const PORT = process.env.PORT || 3000;
const app = express();
//websocket
const server = require('http').createServer(app);
const ws = require('ws')   
// Require routes
const index = require('./routes/index');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(session({ secret: 'secret' }));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

const wsServer = new ws.Server({port: 8080 });  // WebSocket server

wsServer.on('connection', function connection(socket, request) {
  console.log(`server.js: connection from ${request.connection.remoteAddress}`)
  socket.on('message', function incoming(data) {
    console.log(`server.js: received a message`)
    console.log(data)

    sendToClients(data, socket)
  })
  socket.on('close', function(){
    console.log(`Watch ist disconnected`)
    sendToClients(0, socket)
  });
})
function sendToClients(data, incomingSocket) {
  wsServer.clients.forEach(function each(client) {
    if (client !== incomingSocket && client.readyState === ws.OPEN) {
      //console.log(`server.js: sending to a client; data=${data}`) // it would be nice to include client.url, but this is often undefined
      client.send(data)
    }
  })
}

app.use('/', index);
app.listen(PORT, function() {
  console.log(`Server listening on PORT ${PORT}`);
});