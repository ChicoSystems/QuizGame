var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};
socketApi.io = io;

//used to query questions from db
var JQuestion               = require('../models/jQuestions');

var usernames = {};
var rooms = {};//["lobby": {owner: "SERVER", seconds: "", type: "lobby"}];
rooms.lobby = {owner: "SERVER", seconds: "", difficutly: "", turns: 0, type: "lobby", users: []};

io.on('connection', function(socket){
  console.log("on connection");
  io.rooms = rooms;
  socket.on('addUser', function(username, id){
    console.log("addUser - username: " + username + "  id: " + id);
    socket.username = username;
    socket.myid = id;
    socket.room = "lobby";
    usernames[username] = username;
    var user = {"username":username, "chat":["", ""], "score":0, "id": id};
    rooms["lobby"].users.push(user);
    rooms["lobby"].stat = "lobby";
//    console.log("rooms: " + JSON.stringify(rooms));
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
      io.sockets.in(socket.ownedRoom).emit('ownerleftgame');
      //cause all players in room, to switch to lobby
      //io.sockets.in(socket.ownedRoom).emit('switchToLobby', "lobby");
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
    
    var user = {"username":socket.username, "chat":["", ""], "score": 0, "id":socket.myid};
    var newRoom = {owner: room.owner, seconds: room.seconds, difficulty: room.difficulty, type: room.type, turns: room.turns, users: [user], stat:"Waiting for Players"};
    rooms[room.roomName] = newRoom;

    console.log("newroom: " + JSON.stringify(newRoom));
    //remove user from old room
    //var index = rooms[socket.room].users.indexOf(socket.username);
    //rooms[socket.room].users.splice(index, 1);
    
    //remove user from oldroom
    var index = rooms[oldroom].users.findIndex(function(o){
        return o.username == socket.username;
    });

    //console.log("removing user with index of: " + index);
    rooms[oldroom].users.splice(index, 1);

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
    //console.log(socket.username + "switching to room: " + newroom + " from: " + socket.room);
    var oldroom = socket.room;
    
    if(socket.ownedRoom != null && socket.ownedRoom == oldroom){
      io.sockets.in(socket.ownedRoom).emit('updatechat', 'SERVER', 'Host has left room ' + socket.ownedRoom + " Rejoining Lobby");
      io.sockets.in(oldroom).emit('displaylobby', "displaying lobby");
      io.sockets.in("lobby").emit('updaterooms', rooms);
      delete rooms[socket.ownedRoom];
    } 
    socket.leave(socket.room);

    //if old room still exists, remove this user from it
    if(rooms[oldroom]){
      //remove user from old room
      //console.log("users: " + JSON.stringify(rooms[oldroom].users));

      //remove user from oldroom
      var index = rooms[oldroom].users.findIndex(function(o){
        //console.log("socket.username: " + socket.username);
        //console.log("o: " + JSON.stringify(o));
          return o.username == socket.username;
      });

      //console.log("removing user with index of: " + index);
      rooms[oldroom].users.splice(index, 1);
    
      io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left this room to join: ' + newroom);
      io.sockets.in(oldroom).emit('updateusers', rooms[oldroom].users);
    }    

    //add user to newly joined room
    var user = {"username":socket.username, "chat":["", ""], "score": 0, "id": socket.myid}; 
    rooms[newroom].users.push(user);

    socket.join(newroom);
    socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);
    socket.room = newroom;
    io.sockets.in(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room: ' + newroom);
    io.sockets.in(newroom).emit('updateusers', rooms[newroom].users);
    //console.log("rooms: " + JSON.stringify(rooms));
    
    //have frontend display the gameroom instead of the lobby
    socket.emit('displaygameroom', rooms[newroom]);
  
  });

  socket.on('updatechat', function(text){
    console.log("updatechat- username: " +socket.username + " text: " + text);
    console.log("room: " + JSON.stringify(rooms[socket.room]));
    //update the chat record, in the users record, in the rooms record
    //get user index
    var index = rooms[socket.room].users.findIndex(function(o){
      //console.log("socket.username: " + socket.username);
      //console.log("o: " + JSON.stringify(o));
        return o.username == socket.username;
    });
    console.log("userindex: " + index);
    //console.log("user to update: " + JSON.stringify(rooms[socket.room].users[index]));
    rooms[socket.room].users[index].chat[0] = rooms[socket.room].users[index].chat[1];
    rooms[socket.room].users[index].chat[1] = text;
    //console.log("user to update: " + JSON.stringify(rooms[socket.room].users[index]));
    
    io.sockets.in(socket.room).emit('updatechat', socket.myid, text);
  });

  //owner of a room clicked the changestatus button
  socket.on('changestatus', function(newStatus){
    var roomName = socket.ownedRoom;
    //change the status saved here
    if(rooms[roomName])rooms[roomName].stat = newStatus;
    //update all users in room of status change
    io.sockets.in(roomName).emit('statuschanged', newStatus);
    //update all users in lobby of room status change
    io.sockets.in('lobby').emit('updaterooms', rooms);
  });

  //get question for a room
  socket.on('getquestion', function(){
    var roomName = socket.ownedRoom;
  
    //query db for a jquestion
    var filter ={subDiscipline: {$exists: true}};
    var fields =  {};
    JQuestion.findRandom(filter, fields, {limit: 1}, function(err, result){
      if(err) throw err;

      var questionType = 'jQuestion';
      //find 11 answers with the same subDiscipline as result
      var filter = {answer: {$ne: result[0].answer}, subDiscipline: result[0].subDiscipline};
      var fields = {answer: 1};
      JQuestion.findRandom(filter, fields, {limit: 11}, function(error, answers){
        if(error) throw error;
        //splice the correct answer into the list of answers
        var answerIndex = Math.floor(Math.random() * 12);
        if(answers == null)return 0;
        answers.splice(answerIndex, 0, {answer: result[0].answer});
        //modify the answer array to answer is stored as "label"

        for(var i = 0; i < answers.length; i++){
          answers[i]["label"] = answers[i]["answer"];  
    
        }
        console.log("room: " + JSON.stringify(rooms));
        if(rooms[roomName] == null){
          var users = [];
        }else{
           var users = rooms[roomName].users;
        }
        console.log("users: " + JSON.stringify(users));
 
        //send category, answer, answers, answerIndex back to frontends
        io.sockets.in(roomName).emit('getquestion', {
          category: result[0].category,
          question: result[0].question,
          answer: result[0].answer,
          answers : answers,
          answerIndex: answerIndex,
          questionType: questionType,
          questionId : result[0]._id,
          users : users
        });


      });
    });
  });

  //user reports they got a question correct
  socket.on('questioncorrect', function(){
    console.log(socket.username+" reports questioncorrect");
    //update specific users score
    
    var index = rooms[socket.room].users.findIndex(function(o){
        return o.username == socket.username;
    });
    var user = rooms[socket.room].users[index];
    rooms[socket.room].users[index].chat[0] = rooms[socket.room].users[index].chat[1];
    rooms[socket.room].users[index].score += 5;
    //console.log(JSON.stringify(rooms));
 
    io.sockets.in(socket.room).emit('questioncorrect', user);
  });
  
  //user reports they got a question wrong
  socket.on('questionwrong', function(){
    console.log(socket.username+" reports questionwrong");
    var index = rooms[socket.room].users.findIndex(function(o){
        return o.username == socket.username;
    });
    var user = rooms[socket.room].users[index];
    rooms[socket.room].users[index].chat[0] = rooms[socket.room].users[index].chat[1];
    rooms[socket.room].users[index].score -= 1;
    
    io.sockets.in(socket.room).emit('questionwrong', user);
  });

  //owner reports end of game
  socket.on('endgame', function(){
    var roomName = socket.ownedRoom;
    
    //update room status 
    if(rooms[roomName])rooms[roomName].stat = "End Game";
     
    //send the endgame event to all users in room
    io.sockets.in(roomName).emit('endgame', rooms[roomName]);
  });

});


module.exports = socketApi;
