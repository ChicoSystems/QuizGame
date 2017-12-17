$(function(){
  //onload

});


function resetClicked(){
  $.get("/resetscore", function(data, status){
    $("#resetmessage").removeClass('displayNone');
    $("#resetmessage").text(data.message + " to " + data.score);
  
  });
}
