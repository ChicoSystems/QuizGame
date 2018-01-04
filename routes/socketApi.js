var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

io.on('connection', function(socket){
  socket.on('join', function(data) {
    console.log(data+ " connected!");
    socket.emit('messages', "Connected");
  });

  socket.on('messages', function(data){
    socket.emit('broad', data);
    socket.broadcast.emit('broad', data);
  });
  
  //list the rooms, from lobby to lobby
  socket.on('listRoomsReq', function(data){
  
    
  });

  //let rooms = socket.rooms;
  //rooms = room.seconds

  socket.on('joinRoom', function(room){
    room = JSON.parse(room);
    console.log("user joining room: " + JSON.stringify(room));
    socket.join(room.roomName, function(){
      
      socket.adapter.rooms[room.roomName].info = room;
      console.log("thisroom: " + JSON.stringify(socket.adapter.rooms[room.roomName]));
      //io.sockets.in(room).emit('messages', 'User joined room: '+room);
      //io.sockets.in(room.roomName).emit('listRooms', socket.adapter.rooms);
      socket.emit("joinedRoom", {"message" : "joined room " + socket.adapter.rooms[room.roomName]});
    });
  });

});

socketApi.sendNotification = function(){
  io.sockets.emit('hello', {msg: 'Hello World!'});
}

module.exports = socketApi;
