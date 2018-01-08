//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;                   //The socket.io instance
var amIRoomOwner = false;     //Keeps track if we own the room we are in
var secondsPerQuestion = 0;   //The number of seconds given to answer each question
var roundsPerGame = 0;        //The number of questions in each game
var timer;                    //Used to count down seconds in each question
var timeLeft = 0;             //The number of seconds left in the current question
var lobbyTimer;               //Used to count down time at end of game
var lobbyTimeLeft = 0;        //The # of seconds left currently @ end of game
var questionId = "";          //The DB id of the current question
var questionType = "";        //The type of the current question
var answerIndex;              //The index of the current answer
var answersLength;            //The number of current answers
var round = 1;                //The current question number we are on

//If User presses enter button, we want to send what is in chat box
$(document).keypress(function(e) {
  if(e.which == 13) {
    sendChat();   
  }
});

//This is called when the page is loaded, register socket listeners, etc.
$(function(){

  //We don't want to display the game room at first, just the lobby
  $('.gameroom').hide();

  //Initiate the socket connection.
  socket = io.connect(serverIP, {'forceNew': true});

  //Server tells us we've connected
  socket.on('connect', function(data) {
    //Make sure we are logged in, if not, redirect to login page
    checkifLoggedIn();
    
    //Tell server to add us to the lobby
    socket.emit('addUser', name, id);
  });

  //Server tells us to update our users list
  socket.on('updateusers', function(users){
    //First Empty the users section in the DOM  
    $(".users").empty();
  
    //Loop through each user sent by server, add each to DOM
    $.each(users, function(key, value){
      var userHTML = '<div class="card col-sm-3 userRecord" id="'+ value.id +'"> ' +
        ' <div class="card-block">' +
        '   <div class = "card-title text-center"> ' +
        '     <h5>'+value.username+'</h5>' +
        '       <h6 id="score_'+value.id+'">'+value.score+'</h6>'  +
        '   </div> ' +
        '   <div class="chat"> ' +
        '     <div>'+value.chat[0]+'</div> ' +
        '     <div>'+value.chat[1]+'</div> ' +
        '   </div> ' +
        ' </div> </div>';
      $(".users").append(userHTML);
    });
  });

  //Server tells us a user has sent a chat
  socket.on('updatechat', function(myid, data){

    //Check if chat is from server
    if(myid == 'SERVER'){
      //Chat is from server, add it to conversation area at bottom of page
      $("#conversation").append('<b>' + myid + ':</b> ' + data + '<br>');
    }else{
      //Chat is from a user, update that individual users chat section
      $("div#"+myid+" > div.card-block > div.chat :first").remove();
      $("div#"+myid+" > div.card-block > div.chat").append("<div>"+data+"</div>");
    }
  });

  //Server tells us to update our list of rooms
  socket.on('updaterooms', function(rooms){
    //delete all rooms in the DOM list
    $("#roomsTable > tbody:last").children('tr:not(:first)').remove();

    //rebuild DOM rooms section from list of rooms sent from server
    $.each(rooms, function(key, value){
      if(value.type == "gameroom"){
        var newRoom = '<tr> ' + 
          ' <td> ' + key + '</td> ' + 
          ' <td> ' + value.seconds + '</td> ' +
          ' <td> ' + value.turns + '</td> ' +
          ' <td> ' + value.stat + '</td>' + 
          ' <td> ' +
          '   <button type="button" class="btn btn-success" onclick="switchRoom(\' '+ key + ' \')">Join</button> </td> ' + 
          ' </tr> ';;
        $('#roomsTable').append(newRoom);
      }
    });
  });//end updaterooms

  //Server tells us to display the game room
  socket.on('displaygameroom', function(room){
    //check if we are the room owner of this game room
    var roomOwner = room.owner;
    secondsPerQuestion = room.seconds;
    roundsPerGame = room.turns;
    if(roomOwner == name){
      amIRoomOwner = true;
    }else{
      amIRoomOwner = false;
    }

    //Hide the lobby room
    $('.lobby').hide();
    
    //get room status to show
    $('#quizgamestatus').text(room.stat);

    //Show the status change button if we are the rooms owner
    if(amIRoomOwner) displayStatusChangeButton();
    
    //show the game room, but hide the question, as game hasn't started yet
    $('#quizgamequestion').hide();
    $('#endgame').hide();
    $('.gameroom').show();
  });
  
  //Server tells us to show the lobby
  socket.on('displaylobby', function(room){
    //No one owns the lobby
    amIRoomOwner = false;

    $('.gameroom').hide();
    $('.lobby').show();
  });

  //Server tells us owner left the game in progress
  //user should reload lobby completely.
  socket.on('ownerleftgame', function(){
    window.location.href = '/lobby';
  });  

  //the status of the room we are in has changed
  socket.on('statuschanged', function(newStatus){
    //If status has change to "In Game" start the game
    if(newStatus == "In Game"){
      startGame(); 
    }

    //update the status display
    $("#quizgamestatus").text(newStatus);
  });

  //Server has told us the game has ended
  socket.on('endgame', function(room){
    //Display the end of game scores, redeem points, etc
    endGame(room);
  });


  //the server has sent us a new question to display
  socket.on('getquestion', function(data){
    questionId = data.questionId;
    questionType = data.questionType;
    answerIndex = data.answerIndex;
    answersLength = data.answers.length;
    updateRound(data);
    updateUserRecord(data) 
    displayQuestion(data);
    displayAnswers(data);
    startTimer();
  });


  //Server tells us a user got a question correct, turn users card green
  socket.on('questioncorrect', function(correctUser){
    $("#"+correctUser.id+".userRecord").removeClass("playeriswrong");
    $("#"+correctUser.id+".userRecord").addClass("playerisright");
    $("#score_"+correctUser.id).text(correctUser.score);
  });

  //Server tells us a user got a question wrong, turn users card red
  socket.on('questionwrong', function(wrongUser){
    $("#"+wrongUser.id+".userRecord").removeClass("playerisright");
    $("#"+wrongUser.id+".userRecord").addClass("playeriswrong"); 
    $("#score_"+wrongUser.id).text(wrongUser.score);
  });

  //server is instructing a user in room to remove himself
  //check if that user is me, if so, load main app page
  socket.on('removeyourself', function(removeID){
    if(removeID == id){
      //it is me, remove myself
      window.location.href = '/';
    }
  });
});

//queries the backend to see if we are logged in, if so, does nothing, if not, loads lobby
function checkifLoggedIn(){
  $.get("/isloggedin", function(data, status){
    if(data == "false"){
      window.location.href = "/lobby";
    }
  });
}

//updates the ingame user records, colors
function updateUserRecord(data){
  var users = data.users;
  for(var i = 0; i < users.length; i++){
    //reset each userRecord
    $("#"+users[i].id+".userRecord").removeClass("playerisright");
    $("#"+users[i].id+".userRecord").removeClass("playeriswrong");
  } 

}

//Display all possible answers to a question
function displayAnswers(data){
  $("#quizgameanswers").empty();
  var answers = ''+
  ' <div class="btn-group-lg btn-group-justified row">';
  if(data.answers.length == 12){
    for(var i = 0; i < 4; i++){
      var answer = ''+
        ' <a onclick="answerClicked('+i+')" id="'+i+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answers[i]["answer"]+'</a> ';
      answers+=answer;
    }

    answers+= "</div>";  
    answers+= ' <div class="btn-group-lg btn-group-justified row">';

    for(var i = 4; i < 8; i++){
      var answer = ''+
        ' <a onclick="answerClicked('+i+')" id="'+i+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answers[i]["answer"]+'</a> ';
      answers+=answer;
    }
    answers+= "</div>";  
    answers+= ' <div class="btn-group-lg btn-group-justified row">';

    for(var i = 8; i < 12; i++){
      var answer = ''+
        ' <a onclick="answerClicked('+i+')" id="'+i+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answers[i]["answer"]+'</a> ';
      answers+=answer;
    }
    answers+= "</div>";  
  }else{
    //we didn't have 12 answers, just display the correct answer
    var answer = ''+
        ' <a onclick="answerClicked('+data.answerIndex+')" id="'+data.answerIndex+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answer+'</a> ';
    answers+=answer;
      
  }
    answers+='</div>';
   
    $("#quizgameanswers").append(answers); 
}

//the round gets updated and displayed displayed
function updateRound(data){
  $("#roundDiv").text(round+" / " + roundsPerGame);   
}

//the question gets diplayed
function displayQuestion(data){
  //Update the question, text, answers and categories
  $("#questionText").text(data.question);
  $("#quizgamecategory").text(data.category);

  //show the question section
  $('#quizgamequestion').show();
}

//The Game gets started by the owner
function startGame(){
  //Owner instructs server to send everyone a question
  if(amIRoomOwner){
    socket.emit('getquestion');
  }
}

//Sort users by largest score
function compareUsersByScore(a, b){
  if(a.score <= b.score){
    return 1;
  }

  if(a.score > b.score){
    return -1;
  }
}

//the game has been ended by owner
function endGame(room){
  clearInterval(timer); //Reset the question timer
  
  var users = room.users;
  users = users.sort(compareUsersByScore); 

  //Make sure end game information in DOM is empty
  $('#endgamebody').empty();
  var usersHTML = '';
  var myBonus = 0;

  //Rebuild information of end game DOM
  for(var i = 0; i < users.length; i++){
    var place = i+1; //The place the user has ended in, matches are random
    
    //calculate users bonus
    var baseScore = 100;
    var baseNumQ = 20;
    var userBonus = (baseScore / place) * (round / roundsPerGame) * (roundsPerGame / baseNumQ);
    userBonus = Math.round(userBonus);
    
    //Find out if this users is me
    var itsMe = false;
    if(users[i].username == name){
      myBonus = userBonus;
      itsMe = true;
    }
    
    //Building the html to add to the dom
    usersHTML += '<tr>'; 
    usersHTML += '<td>' + place + '</td>';
    usersHTML += '<td>' + users[i].username + '</td>';
    usersHTML += '<td>' + users[i].score + '</td>';
    usersHTML += '<td>' + userBonus + '</td>';
    usersHTML += '</tr>';
  }

  //Add the built html to the dom
  $('#endgamebody').append(usersHTML); 

  //hide question and answers
  $('#quizgamequestion').hide();
  $('#quizgameanswers').hide();

  //update quiz game status
  $('#quizgamestatus').text(room.stat);

  //redeem my bonus score on the server backend
  redeemBonus(myBonus);

  //remove statusChangeButton
  $("#statusChangeButton").hide();
  
  //add lobby button
  addLobbyButton();

  //start lobby countdown
  startLobbyCountdown();

  //show end game table
  $('#endgame').show();
}

//Create a "Lobby" button and add it to the page, allowing the user to leave to lobby
function addLobbyButton(){
  var button = '<button type="button" class="btn btn-primary" id="lobbyButton" onclick="loadLobby()"> Lobby <div id="lobbytimer"></div> </button>';
  $("#statusChangeDiv").append(button);
}

//starts a countdown in the lobby button, when it is done it loads lobby
function startLobbyCountdown(){
  lobbyTimeLeft = 10; //Time given for reviewing end of game table

  //Start the timer
  timer = setInterval(function(){
    lobbyTimeLeft--;
    $("#lobbytimer").text(lobbyTimeLeft);
    if(lobbyTimeLeft <= 0)loadLobby();
  }, 1000);
}

//Reload the /lobby page, causes socket.io disconnection, and connection
function loadLobby(){
  window.location.href = "/lobby";
}

//Redeem given bonus with backend server
function redeemBonus(bonus){
  //send redeemBonus get to server
  $.ajax({
        type: "POST",
        url: "/redeembonus",
        data:{
          bonus: bonus
        },
        success: function(data){
          console.log("success redeeming bonus" + data);
        },
        error: function(err){
          console.log("error redeeming bonus: " + err);
        }
    });
}

//Starts the Question timer
function startTimer(){
  clearInterval(timer);
  timeLeft = secondsPerQuestion;
  $("#timerDiv").text(timeLeft);
  timer = setInterval(function(){
    timeLeft--;
    $("#timerDiv").text(timeLeft);
    if(timeLeft <= 0)stopTimer();
  }, 1000);
}

//Stops the question timer
//we either need to get another question, or show end of game stats
function stopTimer(){
  clearInterval(timer);
  if(round >= roundsPerGame){
    //deactivate all buttons, and show correct answer
    $('#'+answerIndex).removeClass("btn-outline-primary");
    $('#'+answerIndex).addClass("btn-success");
    for(var i = 0; i < answersLength; i++){
      $('#'+i).addClass("disabled");
    } 
    //alert("now show the end of the game");
    if(amIRoomOwner)socket.emit('endgame');
  }else{
    //increase round
    round++;
    //deactivate all buttons, and show correct answer
    $('#'+answerIndex).removeClass("btn-outline-primary");
    $('#'+answerIndex).addClass("btn-success");
    for(var i = 0; i < answersLength; i++){
      $('#'+i).addClass("disabled");
    } 
    
    //pause for 1 second
    setTimeout(function() { 
      //if we are the owner of this room we get another question
      if(amIRoomOwner){
        //i am the room owner, tell the server to get us all a new question
        socket.emit('getquestion');
        //alert("i am room owner");
      }      
     }, 1000);
  }
}

//Displays Change status button on page, only owner of room should call this
function displayStatusChangeButton(){
  var statusChangeButton = '<button type="button" class="btn btn-danger" id="statusChangeButton" onclick="statusChangeClicked()"> Start Game </button>';
  $("#statusChangeDiv").append(statusChangeButton);
}

//Change Status Button has been clicked
function statusChangeClicked(){
  //Get the previous status
  var previousStatus = $("#quizgamestatus").text();
  var nextStatus = "error"; //default next status

  //decide next status based on previous status
  if(previousStatus == "Waiting for Players"){
    nextStatus = "In Game";
    //startGame();
    //change button
    $("#statusChangeButton").text("End Game");
  }else if(previousStatus == "In Game"){
    nextStatus = "End Game";
  }
  if(nextStatus == "End Game"){
    //Tell server the game has ended
    socket.emit('endgame');
  }else{
    //Tell server about status change
    socket.emit('changestatus', nextStatus);
  }
}

//Switch to another game room, or lobby
function switchRoom(roomToSwitch){
  roomToSwitch = roomToSwitch.trim();

  //tell server room we want to switch to
  socket.emit('switchroom', roomToSwitch);
}

//Create a new game room
function createRoom(){
  var seconds = $('#secondsInput').val(); //The seconds per question we want
  var turns = $('#turnsInput').val(); //The question per game we want
  
  //New room name is a mix of users name, and a random number
  var roomName = name + "-" + (Math.floor((Math.random() * 1000) + 1));
  roomName = roomName.trim(); //No leading or trailing spaces in room name

  //Disable the create room button, so we cannot accidently create a room 2 times
  $("#createButton").addClass("disabled");
  $("#createButton").attr("disabled", "disabled");

  //Tell the server about the room we want to create
  socket.emit('createRoom', JSON.stringify({
    roomName: roomName,
    owner   : name,
    seconds: seconds,
    turns : turns,
    difficulty: "easy",
    type : "gameroom"
  })); 
}

//Send a chat message to the server
function sendChat(){
  var text = $("#chatInput").val();
  socket.emit('updatechat', text);
  $("#chatInput").val('');
}

//the user clicked an answer button
//we need to send a message to the normal server, as well as the socket room
function answerClicked(indexClicked){

    $('#'+indexClicked).removeClass("btn-outline-primary");
   
  //check if answer was correct
  if(indexClicked == answerIndex){
    //alert("you are correct");
    $('#'+indexClicked).addClass("btn-success");
    //send report to server & to socket
    questionCorrect(questionType, questionId);
  }else{
    //alert("wrong answer");
    $('#'+indexClicked).addClass("btn-danger");
    questionWrong(questionType, questionId);
    //send report to server & to socket
  }
  //this game mode only allows 1 guess, so disable all buttons
  for(var i = 0; i < answersLength; i++){
    $('#'+i).addClass("disabled");
  } 
}

//the user got the question correct
//send a report to the server & the socket
function questionCorrect(qtype, qid){
  //send report to socket
  socket.emit('questioncorrect');
  
  //send report to server
  $.get("/rightanswer/"+qtype+"/"+qid);
}

//the user got the question wrong
//send a report to the server & the socket
function questionWrong(qtype, qid){
  socket.emit('questionwrong');
  $.get("/wronganswer/"+qtype+"/"+qid);
}

//The user clicked the "report problems with question" link.
function reportProblemClicked(){
  var problem = $("input[type='radio']:checked").parent().text();

  //report the problem to backend
   $.ajax({
        type: "POST",
        url: "/reportproblems",
        data:{
          id: questionId,
          problem: problem,
          questionType: questionType
        },
        success: function(data){
          console.log("success submitting problem: " + data);
        },
        error: function(err){
          console.log("error submitting problem: " + err);
        }
    });
}

