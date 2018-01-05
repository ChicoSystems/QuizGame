var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

var usernames = {};
var rooms = {};//["lobby": {owner: "SERVER", seconds: "", type: "lobby"}];
rooms.lobby = {owner: "SERVER", seconds: "", difficutly: "", type: "lobby", users: []};

io.on('connection', function(socket){
  io.rooms = rooms;
  socket.on('addUser', function(username){
    socket.username = username;
    socket.room = "lobby";
    usernames[username] = username;
    rooms["lobby"].users.push(username);
    //console.log("rooms: " + JSON.stringify(rooms));
    socket.join("lobby");
    socket.emit('updatechat', 'SERVER', 'You have connected to the lobby ' + socket.username);
    socket.broadcast.to("lobby").emit('updatechat', 'SERVER', username + ' has connected to this room');
    socket.emit('displaylobby');
    socket.emit('updaterooms', rooms);
    io.sockets.in('lobby').emit('updateusers', rooms['lobby'].users);
  });

  socket.on('disconnect', function(){
    console.log("user disconnected: " + socket.username);
    delete usernames[socket.username];

    //remove user from room
    if(rooms[socket.room]){
      var index = rooms[socket.room].users.indexOf(socket.username);
      rooms[socket.room].users.splice(index, 1);
      console.log("user: " + JSON.stringify(rooms[socket.room].users));
      io.sockets.in(socket.room).emit('updateusers', rooms[socket.room].users);
    }

    if(socket.ownedRoom != null){
      delete rooms[socket.ownedRoom];
      io.sockets.in(socket.ownedRoom).emit('updatechat', 'SERVER', 'Host has left room ' + socket.ownedRoom + " Rejoining Lobby");
      io.sockets.in(socket.ownedRoom).emit('displaylobby', "displaying lobby");
      io.sockets.in("lobby").emit('updaterooms', rooms);
    } 

    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    socket.leave(socket.room);
  });

  //a user wants to create a new room
  //create a room, leave your old room, and join your new one.
  socket.on('createRoom', function(room){
    var oldroom = socket.room;
    var room = JSON.parse(room);
    var newRoom = {owner: room.owner, seconds: room.seconds, difficulty: room.difficulty, type: room.type, users: [socket.username]};
    rooms[room.roomName] = newRoom;

    //remove user from old room
    var index = rooms[socket.room].users.indexOf(socket.username);
    rooms[socket.room].users.splice(index, 1);

    //tell client to update rooms
    socket.emit('updaterooms', rooms);
    
    //tell the lobby about the new room
    io.sockets.in("lobby").emit('updaterooms', rooms);
  
    //leave the old room
    socket.leave(oldroom);
 
    //actually join the new room
    socket.join(room.roomName);
    
    socket.ownedRoom = room.roomName;
    socket.room = room.roomName;
 
    //tell old room we have left
    io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left the room to create: ' +room.roomName);
  
    //update old rooms users displays
    io.sockets.in(oldroom).emit('updateusers', rooms[oldroom].users);
    //update new rooms users displays
    io.sockets.in(room.roomName).emit('updateusers', rooms[room.roomName].users);
    //console.log("created room " + JSON.stringify(rooms[room.roomName]));   
    //console.log("socket.user " + socket.user);   
 
    //tell new room we have joined
    io.sockets.in(room.roomName).emit('updatechat', 'SERVER', socket.username + ' has joined the room');    
    socket.emit('updatechat', 'SERVER', socket.username + ' has joined the room ' + socket.room);    
    
    //have frontend display the gameroom instead of the lobby
    socket.emit('displaygameroom', rooms[room.roomName]);
  });

  socket.on('switchroom', function(newroom){
    //if the room has not been created, we cannot switch to it.
    if(rooms[newroom] == null) return 0;
    console.log(socket.username + "switching to room: " + newroom + " from: " + socket.room);
    var oldroom = socket.room;
    
    if(socket.ownedRoom != null && socket.ownedRoom == oldroom){
      io.sockets.in(socket.ownedRoom).emit('updatechat', 'SERVER', 'Host has left room ' + socket.ownedRoom + " Rejoining Lobby");
      io.sockets.in(oldroom).emit('displaylobby', "displaying lobby");
      io.sockets.in("lobby").emit('updaterooms', rooms);
      delete rooms[socket.ownedRoom];
    } 
    socket.leave(socket.room);

    //remove user from old room
    var index = rooms[oldroom].users.indexOf(socket.username);
    rooms[oldroom].users.splice(index, 1);
    
    //add user to newly joined room
    rooms[newroom].users.push(socket.username);

    socket.join(newroom);
    socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);
    io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left this room to join: ' + newroom);
    io.sockets.in(oldroom).emit('updateusers', rooms[oldroom].users);
    socket.room = newroom;
    io.sockets.in(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room: ' + newroom);
    io.sockets.in(newroom).emit('updateusers', rooms[newroom].users);
    //console.log("rooms: " + JSON.stringify(rooms));
    
    //have frontend display the gameroom instead of the lobby
    socket.emit('displaygameroom', rooms[newroom]);
  
  });

  socket.on('updatechat', function(text){
    io.sockets.in(socket.room).emit('updatechat', socket.username, text);
  });

});


module.exports = socketApi;
