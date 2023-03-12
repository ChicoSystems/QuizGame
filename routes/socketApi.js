var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};
socketApi.io = io;

//used to query questions from db
var JQuestion               = require('../models/jQuestions');
var QuizQuestion            = require('../models/quizQuestions');

//Used for difficulty settings
var rwc                     = require('random-weighted-choice');
var rwc0 = [
  {weight: 100, id: 0},
  {weight: 0, id: 1}
];

var rwc1 = [
  {weight: 90, id: 0},
  {weight: 10, id: 1}
];

var rwc2 = [
  {weight: 55, id: 0},
  {weight: 45, id: 1}
];

var rwcTable = [];
rwcTable.push(rwc0);
rwcTable.push(rwc1);
rwcTable.push(rwc2);


var rooms = {};//["lobby": {owner: "SERVER", seconds: "", type: "lobby"}];
rooms.lobby = {owner: "SERVER", seconds: "", difficutly: "", turns: 0, type: "lobby", users: []};

//A client connects to socket.io server
io.on('connection', function(socket){
  //console.log("on connection");
  //console.log('users: ' + JSON.stringify(rooms["lobby"].users));
  io.rooms = rooms;
  socket.on('addUser', function(username, id){
    console.log("addUser - username: " + username + "  id: " + id);
    socket.username = username;
    socket.myid = id;
    socket.room = "lobby";
    
    //if there is already a user in the lobby with this id, we tell him to load main page
    var index = rooms[socket.room].users.findIndex(function(o){
       return o.id == socket.myid;
    });
    if(index != -1){
      //we become the user in this room that is already present, tell any other socket with
      //same user to leave
      rooms[socket.room].users[index].status = "present";
      console.log("users told to remove themselves from lobby");
      io.sockets.in('lobby').emit('removeyourself', id);
    }else{
      //we are being added to this room for the first time
      //Add the user to the lobby
      var user = {"username":username, "chat":["", ""], "score":0, "id": id, "status": "present"};
      rooms["lobby"].users.push(user);
    }

    rooms["lobby"].stat = "lobby";
    socket.join("lobby");
    socket.emit('updatechat', 'SERVER', 'You have connected to the lobby ' + socket.username);
    socket.broadcast.to("lobby").emit('updatechat', 'SERVER', username + ' has connected to this room');
    socket.emit('displaylobby');
    socket.emit('updaterooms', rooms);
    io.sockets.in('lobby').emit('updateusers', rooms['lobby'].users);
  });

  //A client disconnects from socket.io server
  socket.on('disconnect', function(){
    console.log("user disconnected: " + socket.username + " from: " +socket.room);

    //We don't want to remove user from room when they disconnect
    //but we do want to mark them as absent, so they don't show up as a user
    //but this way, if they reconnect, they will be able to play with same score
    if(rooms[socket.room]){
      //find users index
      var index = rooms[socket.room].users.findIndex(function(o){
         return o.id == socket.myid;
      });
      //remove user from room record
      //rooms[socket.room].users.splice(index, 1);
      //mark user as absent
      rooms[socket.room].users[index].status = "absent";
      
      //update room on which users are now present.
      io.sockets.in(socket.room).emit('updateusers', rooms[socket.room].users);
    }

    //If we own the room we are leaving, let everyone know room is shut down
    if(socket.ownedRoom != null){
      //remove room from record
      delete rooms[socket.ownedRoom];

      //let everyone in room know it's shut down.
      io.sockets.in(socket.ownedRoom).emit('updatechat', 'SERVER', 'Host has left room ' + socket.ownedRoom + " Rejoining Lobby");
      io.sockets.in(socket.ownedRoom).emit('ownerleftgame');
      
      //let lobby know the room in question has been shut down.
      io.sockets.in("lobby").emit('updaterooms', rooms);
    } 

    //tell everyone on server the user has disconnected
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
  
    //remove socket from room
    socket.leave(socket.room);
  });

  //a user wants to create a new room
  //create a room, leave your old room, and join your new one.
  socket.on('createRoom', function(room){
    var oldroom = socket.room;
    var room = JSON.parse(room);
    
    //create room, add user record to that room
    var user = {"username":socket.username, "chat":["", ""], "score": 0, "id":socket.myid, "status": "present"};
    var newRoom = {owner: room.owner, seconds: room.seconds, difficulty: room.difficulty, type: room.type, turns: room.turns, users: [user], stat:"Waiting for Players"};
    rooms[room.roomName] = newRoom;

    //don't remove user from old room, just mark as absent
    var index = rooms[oldroom].users.findIndex(function(o){
        return o.id == socket.myid;
    });
    //rooms[oldroom].users.splice(index, 1);
    rooms[oldroom].users[index].status = "absent";

    //tell client to update rooms
    socket.emit('updaterooms', rooms);
    
    //tell the lobby about the new room
    io.sockets.in("lobby").emit('updaterooms', rooms);
  
    //leave the old room
    socket.leave(oldroom);
 
    //actually join the new room
    socket.join(room.roomName);
   
    //keep record in socket that we own this room. 
    socket.ownedRoom = room.roomName;
    socket.room = room.roomName;
 
    //tell old room we have left
    io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left the room to create: ' +room.roomName);
  
    //update old rooms users displays
    io.sockets.in(oldroom).emit('updateusers', rooms[oldroom].users);

    //update new rooms users displays
    io.sockets.in(room.roomName).emit('updateusers', rooms[room.roomName].users);
 
    //tell new room we have joined
    io.sockets.in(room.roomName).emit('updatechat', 'SERVER', socket.username + ' has joined the room');    
    socket.emit('updatechat', 'SERVER', socket.username + ' has joined the room ' + socket.room);    
    
    //have client display the newly created room
    socket.emit('displaygameroom', rooms[room.roomName]);
  });

  //A user is switching between rooms
  socket.on('switchroom', function(newroom){
    console.log("switching to room: " + JSON.stringify(rooms[newroom]));

    //if the room has not been created, we cannot switch to it.
    if(rooms[newroom] == null) return 0;

    var oldroom = socket.room;
   
    //check if we had owned the room we are leaving, if so, let other users know, and delete room 
    if(socket.ownedRoom != null && socket.ownedRoom == oldroom){
      io.sockets.in(socket.ownedRoom).emit('updatechat', 'SERVER', 'Host has left room ' + socket.ownedRoom + " Rejoining Lobby");
      io.sockets.in(oldroom).emit('displaylobby', "displaying lobby");
      io.sockets.in("lobby").emit('updaterooms', rooms);
      delete rooms[socket.ownedRoom];
    } 

    //have the socket leave the room
    socket.leave(socket.room);

    //don't remove user, just mark as absent
    if(rooms[oldroom]){
      
      //remove user from oldroom
      var index = rooms[oldroom].users.findIndex(function(o){
          return o.id == socket.myid;
      });
      //rooms[oldroom].users.splice(index, 1);
      rooms[oldroom].users[index].status= "absent";
    
      //let users in old room know we left it
      io.sockets.in(oldroom).emit('updatechat', 'SERVER', socket.username + ' has left this room to join: ' + newroom);
      io.sockets.in(oldroom).emit('updateusers', rooms[oldroom].users);
    }    

  
    //if user has already existed in current room, just change users status to present
    var index = rooms[newroom].users.findIndex(function(o){
          return o.id == socket.myid;
    });
    if(index != -1){
      //user already exists, change status
      rooms[newroom].users[index].status = "present";
    }else{
      //user is joining room for first time
      //otherwise add user to newly joined room
      var user = {"username":socket.username, "chat":["", ""], "score": 0, "id": socket.myid, "status": "present"}; 
      rooms[newroom].users.push(user);
    }
    socket.join(newroom);
    

    //let client know he is connected to new room
    socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);
    socket.room = newroom;

    //let users in new room know about new user in room
    io.sockets.in(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room: ' + newroom);
    io.sockets.in(newroom).emit('updateusers', rooms[newroom].users);
    //console.log("rooms: " + JSON.stringify(rooms));

    /* //buggy, figure out another way to do this
    //if there is already a user in this room with this id, we tell him to load main page
    var index = rooms[newroom].users.findIndex(function(o){
       return o.id == socket.myid;
    });
    if(index != -1){
      //if user we are telling to leave (other copy of us) was owner, then we become owner
      socket.ownedRoom = newroom;
      var id = rooms[newroom].users[index].id;
      console.log("users told to remove themselves from " + newroom);
      io.sockets.in(newroom).emit('removeyourself', id); //this is buggy
    }
    */
    
    //have client display room that was switched to
    socket.emit('displaygameroom', rooms[newroom]);
  
  });

  //A user sends a chat message
  socket.on('updatechat', function(text){
    console.log("updatechat- username: " +socket.username + " text: " + text);
    
    //Record users chat message in their rooms user record
    var index = rooms[socket.room].users.findIndex(function(o){
        return o.id == socket.myid;
    });
    rooms[socket.room].users[index].chat[0] = rooms[socket.room].users[index].chat[1];
    rooms[socket.room].users[index].chat[1] = text;
   
    //let everyone in room see the new chat message 
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

  //room owner's timer wants room to get a new question to answer
  socket.on('getquestion', function(){
    var roomName = socket.ownedRoom;
    if(rooms[roomName] == null)return 0;
    var difficulty = rooms[roomName].difficulty;
    //console.log("difficulty: " + difficulty);

    var randomChooser = rwc(rwcTable[[difficulty]]);
    //console.log("randomChooser: " + randomChooser);

    if(randomChooser == 0){
      sendJQuestion(socket);
    }else{
      sendQuizQuestion(socket);
    }  
    
    /*
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

        if(rooms[roomName] == null){
          var users = [];
        }else{
           var users = rooms[roomName].users;
        }
 
        //send category, answer, answers, answerIndex back to everyone in room
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
    }); */
  });

  //user reports they got a question correct
  socket.on('questioncorrect', function(){
    //update specific users in room score (this is not the score in db) 
    var index = rooms[socket.room].users.findIndex(function(o){
        return o.id == socket.myid;
    });
    var user = rooms[socket.room].users[index];
    rooms[socket.room].users[index].chat[0] = rooms[socket.room].users[index].chat[1];
    rooms[socket.room].users[index].score += 5;

    //let all the users in room know this user got the question correct 
    io.sockets.in(socket.room).emit('questioncorrect', user);
  });
  
  //user reports they got a question wrong
  socket.on('questionwrong', function(){
    //modify users in room score
    var index = rooms[socket.room].users.findIndex(function(o){
        return o.id == socket.myid;
    });
    var user = rooms[socket.room].users[index];
    rooms[socket.room].users[index].chat[0] = rooms[socket.room].users[index].chat[1];
    rooms[socket.room].users[index].score -= 1;
    
    //let all users in room know this user got the question wrong
    io.sockets.in(socket.room).emit('questionwrong', user);
  });

  //rooms owner reports the game has ended
  socket.on('endgame', function(){
    var roomName = socket.ownedRoom;
    
    //update room status 
    if(rooms[roomName])rooms[roomName].stat = "End Game";
     
    //send the endgame event to all users in room
    io.sockets.in(roomName).emit('endgame', rooms[roomName]);
  });
});


// sends a jquestion to all clients in sockets room
async function sendJQuestion(socket){
  var roomName = socket.room;


    //first we get a random question from the JQuestions   
  ///////var filter = {}; // this filter queries the entire jQuestion database, chat gpt will be used to transform questions
  var filter = {wrongAnswers: {$exists: true}}; // This filter queries questions in the db, where wrong answers exist, this means that chatgpt will not be used
  var fields = {}; //only pull up the answers

  // Get a random entry
  //var count = await JQuestion.find(filter, fields).countDocuments();
  var count = await JQuestion.countDocuments(filter); 
  var random = Math.floor(Math.random() * count)

  // Attempt new query
  var result = await JQuestion.findOne(filter, fields).skip(random);
  console.log(result);

  // Check if the wrongAnswers field exists in this document, if it doesn't, we're going to
  // generate wrong answers with chatGPT
  wrongAnswers = [];
  
  if(result.wrongAnswers.length == 0){
    //if(true){ // REMOVE THIS AND REPLACE WITH ABOVE
    // If we have no generated answers, we have also not cleaned the question.
    // use chatgpt to clean the question
    newQuestion = await chatGPT("The answer to this jeopardy question is: "+result.answer+". Rewrite this jeopardy question to be a normal question: '" +result.question+ "'. Do not include the anwer.");
    wrongAnswerString = await chatGPT("The answer to the following question is " + result.answer + ". Come up with 11 wrong answers. The question is: " + result.question + " Seperate Answers with a comma.");
    
    // if the wrong answer string ends witha  ., remove it
    if(wrongAnswerString.charAt(wrongAnswerString.length - 1) == '.'){
      wrongAnswerString = wrongAnswerString.slice(0, -1);
    }

    // make wrong answer string completely capital
    wrongAnswerString = wrongAnswerString.toUpperCase();

    //save the newly generated question:
    result.question = newQuestion;

    result.answer = result.answer.toUpperCase();
    
    wrongAnswers = wrongAnswerString.split(",");

    //wrongAnswers = ["Aristarchus", "Tycho Brahe", "Johannes Kepler", "Isaac Newton", "Albert Einstein", "Edwin Hubble", "Stephen Hawking", "Galen", "Andreas Vesalius", "William Harvey", "Robert Boyle"];
    

    if(wrongAnswers.length != 11){

      // the wrong answer didn't get split by a, comma, maybe a space will work?
      wrongAnswers = wrongAnswerString.split(" ");

      // check if the first item is two new lines, if so, remove it.
      if(wrongAnswers[0] == "\n\n"){
        wrongAnswers.splice(0, 1);
      }

      // maybe splitting by a space worked?
      if(wrongAnswers.length != 11){

        // it still didn't work, maybe splitting my new lines, and removing blanks?
        wrongAnswers = wrongAnswerString.split("\n");
        var temp = [];
        for(item in wrongAnswers){
          if(wrongAnswers[item].length != 0 && wrongAnswers[item] != 0 && wrongAnswers[item] != '0'){
            temp.push(wrongAnswers[item]);
          }
        }

        wrongAnswers = temp;

        if(wrongAnswers.length != 11){
          renderJQuestion(res, req);
          return;
        }else{
          result.wrongAnswers = wrongAnswers;
          result.save();
        }

        
      }else{
        result.wrongAnswers = wrongAnswers;
        result.save();
      }
      
    }else{
      result.wrongAnswers = wrongAnswers;
      result.save();
    }

    
  }else{
    console.log("Skipping ChatGPT Generation");
    wrongAnswers = result.wrongAnswers;
  }

  var answers = [];

  // put the object returnd from db into an array
  for(wA in wrongAnswers){
    answers.push({answer: wrongAnswers[wA]});
  }


  //if signed in, save score into session
  ///if(req.user) req.session.score = req.user.gameinfo.score; // not useable in socketio

  // Mix the correct answer up with the wrong answers
  var answerIndex = Math.floor(Math.random() * 12);
  if(answers == null)return 0;
  answers.splice(answerIndex, 0, {answer: result.answer});

  //modify answers array, so answer is stored as "label" instead of answer
  //this is for compatibility with the quizQuestion type
  
  for(var i = 0; i < answers.length; i++){
    answers[i]["label"] = answers[i]["answer"];
  }

  var questionType = "jQuestion";




  if(rooms[roomName] == null){
    var users = [];
  }else{
     var users = rooms[roomName].users;
  }

  //send category, answer, answers, answerIndex back to everyone in room
  io.sockets.in(roomName).emit('getquestion', {
    category: result.category,
    question: result.question,
    answer: result.answer,
    answers : answers,
    answerIndex: answerIndex,
    questionType: questionType,
    questionId : result._id,
    users : users
  });
}

/*
//sends a jquestion to all clients in sockets room
function sendJQuestion(socket){
  var roomName = socket.room;
  
  
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




      if(rooms[roomName] == null){
        var users = [];
      }else{
         var users = rooms[roomName].users;
      }

      //send category, answer, answers, answerIndex back to everyone in room
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
}

*/

function sendQuizQuestion(socket){
  var roomName = socket.room;
  
  //query db for a quiz question
  var filter = {};
  var fields = {};
  QuizQuestion.findRandom(filter, fields, {limit: 1}, function(err, result){
    if(err) throw err;

    var questionType = 'quizQuestion';

    //find 11 answers with the same category, but different answers
    var filter = {label: {$ne: result[0].label}, category: result[0].category};
    var fields = {label: 1}; //only pull up the answers

    //query the db for the 11 answers
    QuizQuestion.findRandom(filter, fields, {limit: 11}, function(error, answers){
      if(error) throw error;

      //replace any occurance of the string ?? & ??? with " in question
      //replace any occurance of the string "???" in db, with "
      result[0].raw = result[0].raw.replace(new RegExp("???".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), "\'");
      result[0].raw = result[0].raw.replace(new RegExp("??".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), "\'");

      //splice the correct answer into the list of answers
      var answerIndex = Math.floor(Math.random() * 12);
      answers.splice(answerIndex, 0, {label: result[0].label});

      //modify the answer array to answer is stored as "label"
      for(var i = 0; i < answers.length; i++){
        answers[i] = {answer: answers[i]["label"]};//answers[i]["label"];
      }

      console.log("modifiedAnswers: " + JSON.stringify(answers));

      //get users in room
      if(rooms[roomName] == null){
        var users = [];
      }else{
        var users = rooms[roomName].users;
      }

      //send need info to everyone in room
      io.sockets.in(roomName).emit('getquestion', {
        category: result[0].category,
        question: result[0].raw,
        answer  : result[0].label,
        answers : answers,
        answerIndex: answerIndex,
        questionType: questionType,
        questionId  : result[0]._id,
        users       : users
      });

    });
  });

}

module.exports = socketApi;
