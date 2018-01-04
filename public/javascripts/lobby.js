//lobby.js
//a multiplayer lobby
//variable serverIP passed in via .ejs variable
var socket;

$(function(){
  socket = io.connect(serverIP);
  socket.on('connect', function(data) {
    socket.emit('join', name);
  });

  socket.on('messages', function(data){
    console.log(data);
  });

  socket.on('joinedRoom', function(data){
    console.log(data);
    //window.location.href = "/profile";
  });

  socket.on('listRooms', function (rooms){
    alert('rooms :'+ JSON.stringify(Object.getKeys(rooms)) + "<br> " + rooms[0]);
  });

  socket.on

});

function createRoom(){
  var seconds = $('#secondsInput').val();
  alert("name: " + name);
  //var roomName = "testRoom"+(Math.floor((Math.random() * 1000) + 1));
  var roomName = name + ":" + (Math.floor((Math.random() * 1000) + 1));
  $("#createButton").addClass("disabled");
  $("#createButton").attr("disabled", "disabled");

  socket.emit('joinRoom', JSON.stringify({
    roomName: roomName,
    owner   : name,
    seconds: seconds,
    type : "gameroom"
  }));

  
}
