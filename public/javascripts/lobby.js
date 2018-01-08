//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;
var amIRoomOwner = false;
var secondsPerQuestion = 0;
var roundsPerGame = 0;
var timer;
var timeLeft = 0;
var lobbyTimer;
var lobbyTimeLeft = 0;
var questionId = "";
var questionType = "";
var answerIndex;
var answersLength;
var round = 1;

//listen for enter keypress
$(document).keypress(function(e) {
  if(e.which == 13) {
    sendChat();   
  }
});

$(function(){
  $('.gameroom').hide();
  //socket = io.connect(serverIP);
  socket = io.connect(serverIP, {'forceNew': true});

  socket.on('connect', function(data) {
    checkifLoggedIn();
    //alert("onconnect " + name);
    socket.emit('addUser', name, id);
  });

  socket.on('updateusers', function(users){
    //get all users in dom, and their chats, save to array
    //var info = $("div.users > div.userRecord > div.card-block > div.card-title");
    //var info = $(".aname").attr('data-value');
    
/*
    var info = [];
    $(".aname").each(function(){
      console.log("ello");
      alert($(this).text());
    });

    console.log("userRecords: " +JSON.stringify(info));
*/

    console.log("users: " +JSON.stringify(users));
      $(".users").empty();
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

  socket.on('updatechat', function(myid, data){
    if(myid == 'SERVER'){
      $("#conversation").append('<b>' + myid + ':</b> ' + data + '<br>');
    }else{
      console.log("chat from: " + myid + " - " + data);
      $("div#"+myid+" > div.card-block > div.chat :first").remove();
      $("div#"+myid+" > div.card-block > div.chat").append("<div>"+data+"</div>");
    }
  });

  socket.on('updaterooms', function(rooms){
    //delete all rooms in the list
    $("#roomsTable > tbody:last").children('tr:not(:first)').remove();
    //rebuild rooms from list
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

  //display the game room
  socket.on('displaygameroom', function(room){
    //check if we are the room owner of this game room
    var roomOwner = room.owner;
    secondsPerQuestion = room.seconds;
    roundsPerGame = room.turns;
    //alert("timer: " + timer);
    if(roomOwner == name){
      amIRoomOwner = true;
    }else{
      amIRoomOwner = false;
    }
    console.log(JSON.stringify(room));
    $('.lobby').hide();
    
    //get room status to show
    $('#quizgamestatus').text(room.stat);
    if(amIRoomOwner) displayStatusChangeButton();
    
    //show the game room, but hide the question
    $('#quizgamequestion').hide();
    $('#endgame').hide();
    $('.gameroom').show();
    
  });
  
  //display the lobby room
  socket.on('displaylobby', function(room){
    amIRoomOwner = false;
    $('.gameroom').hide();
    $('.lobby').show();
    //socket.emit('switchroom', room);
  });

  //owner left the game in progress
  //user should reload lobby completely.
  socket.on('ownerleftgame', function(){
    window.location.href = '/lobby';
  });  

  //the status of the room we are in has changed
  socket.on('statuschanged', function(newStatus){
    if(newStatus == "In Game"){
      startGame(); 
    }

    //update the status display
    $("#quizgamestatus").text(newStatus);
  });

  socket.on('endgame', function(room){
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
    //alert("getquestion: " + JSON.stringify(data));
  });

  //a user reports they got a question correct, turn users card green
  socket.on('questioncorrect', function(correctUser){
    $("#"+correctUser.id+".userRecord").removeClass("playeriswrong");
    $("#"+correctUser.id+".userRecord").addClass("playerisright");
    $("#score_"+correctUser.id).text(correctUser.score);
  });

  //a user reports they got a question wrong, turn users card red
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

//the answer choices get displayed
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
   
    //alert("answer: " + JSON.stringify(data.answers)); 
    $("#quizgameanswers").append(answers); 
}

//the round gets updated and displayed displayed
function updateRound(data){
  $("#roundDiv").text(round+" / " + roundsPerGame);   
//  alert("data.turns: " + data.turns + "\n roundsPerGame: " + roundsPerGame);
 // alert("updateRound: " + JSON.stringify(data));
}

//the question gets diplayed
function displayQuestion(data){
  $("#questionText").text(data.question);
  $("#quizgamecategory").text(data.category);
  //show the question section
  $('#quizgamequestion').show();
}

//the game has been started by owner
function startGame(){
  //only have owner send emit
  if(amIRoomOwner){
    socket.emit('getquestion');
  }
}

//sort users top score to bottom
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
  clearInterval(timer);
  //alert("the game is ended: " +JSON.stringify(room));
  //build end game table
  var users = room.users;
  users = users.sort(compareUsersByScore); 
  $('#endgamebody').empty();
  var usersHTML = '';
  var myBonus = 0;
  for(var i = 0; i < users.length; i++){
    var place = i+1;
    //calculate users bonus
    var baseScore = 100;
    var baseNumQ = 20;
    //var userBonus = (100 / place)*(round/roundsPerGame);
    var userBonus = (baseScore / place) * (round / roundsPerGame) * (roundsPerGame / baseNumQ);
    var itsMe = false;
    userBonus = Math.round(userBonus);

    if(users[i].username == name){
      myBonus = userBonus;
      itsMe = true;
    }
    
    usersHTML += '<tr>'; 
    usersHTML += '<td>' + place + '</td>';
    usersHTML += '<td>' + users[i].username + '</td>';
    usersHTML += '<td>' + users[i].score + '</td>';
    usersHTML += '<td>' + userBonus + '</td>';

    usersHTML += '</tr>';
  }

  $('#endgamebody').append(usersHTML); 

  //hide question and answers
  $('#quizgamequestion').hide();
  $('#quizgameanswers').hide();

  //update quiz game status
  $('#quizgamestatus').text(room.stat);

  //display redeem bonus button
  //alert("your bonus: " + myBonus);
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

//adds a lobby button to statusChangeDiv
function addLobbyButton(){
  var button = '<button type="button" class="btn btn-primary" id="lobbyButton" onclick="loadLobby()"> Lobby <div id="lobbytimer"></div> </button>';
  $("#statusChangeDiv").append(button);
}

//starts a countdown in the lobby button, when it is done it loads lobby
function startLobbyCountdown(){
  lobbyTimeLeft = 10;
  timer = setInterval(function(){
    lobbyTimeLeft--;
    $("#lobbytimer").text(lobbyTimeLeft);
    if(lobbyTimeLeft <= 0)loadLobby();
  }, 1000);
}

//called to load the lobby page
function loadLobby(){
  window.location.href = "/lobby";
}

//redeem bonus for playing multiplayer game
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

//the timer is restarted
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

//the timer is stopped
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



//if the user is owner of the room, the status change button will show
function displayStatusChangeButton(){
  var statusChangeButton = '<button type="button" class="btn btn-danger" id="statusChangeButton" onclick="statusChangeClicked()"> Start Game </button>';
  $("#statusChangeDiv").append(statusChangeButton);
}

//owner clicked the statusChangeButton
function statusChangeClicked(){
  //alert("status change clicked");
  var previousStatus = $("#quizgamestatus").text();
  var nextStatus = "error";
  if(previousStatus == "Waiting for Players"){
    nextStatus = "In Game";
    //startGame();
    //change button
    $("#statusChangeButton").text("End Game");
  }else if(previousStatus == "In Game"){
    nextStatus = "End Game";
  }
  if(nextStatus == "End Game"){
    socket.emit('endgame');
  }else{
    socket.emit('changestatus', nextStatus);
  }

}

function switchRoom(roomToSwitch){
  //alert("switch to: " + roomToSwitch);
  roomToSwitch = roomToSwitch.trim();
  socket.emit('switchroom', roomToSwitch);
}

function createRoom(){
  var seconds = $('#secondsInput').val();
  var turns = $('#turnsInput').val();
  //alert("name: " + name);
  //var roomName = "testRoom"+(Math.floor((Math.random() * 1000) + 1));
  var roomName = name + "-" + (Math.floor((Math.random() * 1000) + 1));
  roomName = roomName.trim();
  $("#createButton").addClass("disabled");
  $("#createButton").attr("disabled", "disabled");


  socket.emit('createRoom', JSON.stringify({
    roomName: roomName,
    owner   : name,
    seconds: seconds,
    turns : turns,
    difficulty: "easy",
    type : "gameroom"
  })); 
}

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
  //alert("report problems clicked");

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

