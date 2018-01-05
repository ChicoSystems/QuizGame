//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;

$(function(){
  $('.gameroom').hide();
  socket = io.connect(serverIP);

  socket.on('connect', function(data) {
    //alert("onconnect " + name);
    socket.emit('addUser', name);
  });

  socket.on('updateusers', function(users){
    console.log(JSON.stringify(users));
      $(".users").empty();
    $.each(users, function(key, value){
      var userHTML = '<div class="card col-sm-3" id="'+ value +'"> ' +
        ' <div class="card-block">' +
        '   <div class = "card-title text-center"> ' +
        '     <h5>'+value+'</h5>' +
        '   </div> ' +
        '   <div class="chat"> ' +
        '     <div>testChat 1</div> ' +
        '     <div>testChat 2</div> ' +
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
          ' <td> ' +
          '   <button type="button" class="btn btn-success" onclick="switchRoom(\' '+ key + ' \')">Join</button> </td> ' + 
          ' </tr> ';;
        $('#roomsTable').append(newRoom);
      }
    });
  });//end updaterooms

  //display the game room
  socket.on('displaygameroom', function(room){
    console.log(JSON.stringify(room));
    $('.lobby').hide();
    $('.gameroom').show();
  });
  
  //display the lobby room
  socket.on('displaylobby', function(){
    $('.gameroom').hide();
    $('.lobby').show();
    //socket.emit('addUser', name);
  });
 
});

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
