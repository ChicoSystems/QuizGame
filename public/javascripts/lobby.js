//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;
var amIRoomOwner = false;
var secondsPerQuestion = 0;
var timer;
var timeLeft = 0;
var questionId = "";
var questionType = "";

$(function(){
  $('.gameroom').hide();
  socket = io.connect(serverIP);

  socket.on('connect', function(data) {
    //alert("onconnect " + name);
    socket.emit('addUser', name);
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
      var userHTML = '<div class="card col-sm-3 userRecord" id="'+ value.username +'"> ' +
        ' <div class="card-block">' +
        '   <div class = "card-title text-center"> ' +
        '     <h5>'+value.username+'</h5>' +
        '       <h6>'+value.score+'</h6>'  +
        '   </div> ' +
        '   <div class="chat"> ' +
        '     <div>'+value.chat[0]+'</div> ' +
        '     <div>'+value.chat[1]+'</div> ' +
        '   </div> ' +
        ' </div> </div>';
      
      $(".users").append(userHTML);
    });
  });

  socket.on('updatechat', function(username, data){
    if(username == 'SERVER'){
      $("#conversation").append('<b>' + username + ':</b> ' + data + '<br>');
    }else{
      $("div#"+username+" > div.card-block > div.chat :first").remove();
      $("div#"+username+" > div.card-block > div.chat").append("<div>"+data+"</div>");
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
    $('.gameroom').show();
  });
  
  //display the lobby room
  socket.on('displaylobby', function(room){
    amIRoomOwner = false;
    $('.gameroom').hide();
    $('.lobby').show();
    //socket.emit('switchroom', room);
  });

  //the status of the room we are in has changed
  socket.on('statuschanged', function(newStatus){
    if(newStatus == "In Game"){
      startGame(); 
    }else if(newStatus == "End Game"){
      endGame();
    }

    //update the status display
    $("#quizgamestatus").text(newStatus);
  });

  //the server has sent us a new question to display
  socket.on('getquestion', function(data){
    questionId = data.questionId;
    questionType = data.questionType;
    displayQuestion(data);
    displayAnswers(data);
    startTimer();
    //alert("getquestion: " + JSON.stringify(data));
  });
 
});

//the answer choices get displayed
function displayAnswers(data){
  $("#quizgameanswers").empty();
  var answers = ''+
  ' <div class="btn-group-lg btn-group-justified row">';
  if(data.answers.length == 12){
    for(var i = 0; i < 4; i++){
      var answer = ''+
        ' <a href="#" onclick="answerClicked('+i+')" id="'+i+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answers[i]["answer"]+'</a> ';
      answers+=answer;
    }

    answers+= "</div>";  
    answers+= ' <div class="btn-group-lg btn-group-justified row">';

    for(var i = 4; i < 8; i++){
      var answer = ''+
        ' <a href="#" onclick="answerClicked('+i+')" id="'+i+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answers[i]["answer"]+'</a> ';
      answers+=answer;
    }
    answers+= "</div>";  
    answers+= ' <div class="btn-group-lg btn-group-justified row">';

    for(var i = 8; i < 12; i++){
      var answer = ''+
        ' <a href="#" onclick="answerClicked('+i+')" id="'+i+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answers[i]["answer"]+'</a> ';
      answers+=answer;
    }
    answers+= "</div>";  
  }else{
    //we didn't have 12 answers, just display the correct answer
    var answer = ''+
        ' <a href="#" onclick="answerClicked('+data.answerIndex+')" id="'+data.answerIndex+'" class="btn btn-outline-primary col-md-3 btn-responsive">'+data.answer+'</a> ';
    answers+=answer;
      
  }
    answers+='</div>';
   
    //alert("answer: " + JSON.stringify(data.answers)); 
    $("#quizgameanswers").append(answers); 
}

//the question gets diplayed
function displayQuestion(data){
 //alert("displaying question: " + JSON.stringify(question));
  $("#questionText").text(data.question);
  $("#quizgamecategory").text(data.category);
}

//the game has been started by owner
function startGame(){
  socket.emit('getquestion');
}

//the game has been ended by owner
function endGame(){

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
function stopTimer(){
  clearInterval(timer);
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
    nextStatus = "Game Ended";
  }
  socket.emit('changestatus', nextStatus);

}

function switchRoom(roomToSwitch){
  //alert("switch to: " + roomToSwitch);
  roomToSwitch = roomToSwitch.trim();
  socket.emit('switchroom', roomToSwitch);
}

function createRoom(){
  var seconds = $('#secondsInput').val();
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
    difficulty: "easy",
    type : "gameroom"
  })); 
}

function sendChat(){
  var text = $("#chatInput").val();
  socket.emit('updatechat', text);
}

//The user clicked the "report problems with question" link.
function reportProblemClicked(){
  var problem = $("input[type='radio']:checked").parent().text();
  alert("report problems clicked");

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

