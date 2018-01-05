var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

var usernames = {};
var rooms = {};//["lobby": {owner: "SERVER", seconds: "", type: "lobby"}];
rooms.lobby = {owner: "SERVER", seconds: "", difficutly: "", type: "lobby"};

io.on('connection', function(socket){
  io.rooms = rooms;
  socket.on('addUser', function(username){
    socket.username = username;
    socket.room = "lobby";
    usernames[username] = username;
    socket.join("lobby");
    socket.emit('updatechat', 'SERVER', 'You have connected to the lobby ' + socket.username);
    socket.broadcast.to("lobby").emit('updatechat', 'SERVER', username + ' has connected to this room');
    socket.emit('updaterooms', rooms);
  });

  socket.on('disconnect', function(){
    delete usernames[socket.username];

    if(socket.ownedRoom != null){
      delete rooms[socket.ownedRoom];
      socket.broadcast.to("lobby").emit('updaterooms', rooms);
    }

    io.sockets.emit('updateusers', usernames);
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    socket.leave(socket.room);
  });

  //a user wants to create a new room
  //create a room, leave your old room, and join your new one.
  socket.on('createRoom', function(room){
    var oldroom = socket.room;
    var room = JSON.parse(room);
    var newRoom = {owner: room.owner, seconds: room.seconds, difficulty: room.difficulty, type: room.type};
    rooms[room.roomName] = newRoom;

    console.log("createroom - old: " + oldroom + "   new: " + room.roomName);    

    //tell client to update rooms
    socket.emit('updaterooms', rooms);
    
    //tell the lobby about the new room
    socket.broadcast.to("lobby").emit('updaterooms', rooms);
  
    //leave the old room
    socket.leave(oldroom);
 
    //actually join the new room
    socket.join(room.roomName);
    
    socket.ownedRoom = room.roomName;
    socket.room = room.roomName;
 
    //tell old room we have left
    io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left the room to create: ' +room.roomName);
    
    //tell new room we have joined
    io.sockets.in(room.roomName).emit('updatechat', 'SERVER', socket.username + ' has joined the room');    
    socket.emit('updatechat', 'SERVER', socket.username + ' has joined the room ' + socket.room);    
    //console.log("rooms: " + JSON.stringify(rooms));
  });

  socket.on('switchroom', function(newroom){
    console.log(socket.username + "switching to room: " + newroom + " from: " + socket.room);
    var oldroom = socket.room;
    socket.leave(socket.room);
    
    if(socket.ownedRoom != null && socket.ownedRoom == oldroom){
      delete rooms[socket.ownedRoom];
      io.sockets.in("lobby").emit('updaterooms', rooms);
    } 

    socket.join(newroom);
    socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);
    io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left this room to join: ' + newroom);
    socket.room = newroom;
    io.sockets.in(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room: ' + newroom);
    //console.log("rooms: " + JSON.stringify(rooms));
    //socket.emit('updaterooms', rooms);
  
  });
/*
  socket.on('join', function(data) {
    console.log(data+ " connected!");
    socket.emit('messages', "Connected");
  });
*/

  /*
  socket.on('messages', function(data){
    socket.emit('broad', data);
    socket.broadcast.emit('broad', data);
  });
*/
  

  //let rooms = socket.rooms;
  //rooms = room.seconds

/*
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
*/


});

/*
socketApi.sendNotification = function(){
  io.sockets.emit('hello', {msg: 'Hello World!'});
}
*/

module.exports = socketApi;
