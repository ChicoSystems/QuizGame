var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

io.on('connection', function(socket){

  console.log('A user connected ');

  socket.on('join', function(data) {
    console.log(data);
    socket.emit('messages', "Hello from Server");
  });

  socket.on('messages', function(data){
    socket.emit('broad', data);
    socket.broadcast.emit('broad', data);
  });

});

socketApi.sendNotification = function(){
  io.sockets.emit('hello', {msg: 'Hello World!'});
}

module.exports = socketApi;
