//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;
var amIRoomOwner = false;

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
    //update the status display
    $("#quizgamestatus").text(newStatus);
  });
 
});

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
