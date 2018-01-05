//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;

$(function(){
  socket = io.connect(serverIP);

  socket.on('connect', function(data) {
    //alert("onconnect " + name);
    socket.emit('addUser', name);
  });

  socket.on('messages', function(data){
    console.log(data);
  });

  socket.on('joinedRoom', function(data){
    console.log(data);
    //window.location.href = "/profile";
  });

/*
  socket.on('listRooms', function (rooms){
    alert('rooms :'+ JSON.stringify(Object.getKeys(rooms)) + "<br> " + rooms[0]);
  });
*/

  socket.on('updatechat', function(username, data){
    $("#conversation").append('<b>' + username + ':</b> ' + data + '<br>');
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
    $('.lobby').hide();
  });
  
  //display the lobby room
  socket.on('displaylobby', function(){
    $('.lobby').show();
    socket.emit('addUser', name);
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
