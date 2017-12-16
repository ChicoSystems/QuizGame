$(function(){
  console.log("answerIndex: " + answerIndex);
  console.log("loggedIn: " + loggedIn);
});

function loadNewQuestion(){
  window.location.href = "/";
//  alert("loading new question");
}

function answerClicked(indexClicked){
  //alert("clicked answer: " + indexClicked);
  if(indexClicked == answerIndex){
    $('#'+indexClicked).removeClass("btn-primary");
    $('#'+indexClicked).addClass("btn-success"); 
    $('#'+indexClicked).attr("disabled", "disabled");
  
    //disable all buttons
    for(var i = 0; i < 12; i++){
      $('#'+i).attr("disabled", "disabled");
    }
 
    //update score display
    var scoreString = $("#score").text();
    var score = parseFloat(scoreString)+5;
    $("#score").text(score);
   
    //only make an ajax call to server if logged in
    if(loggedIn){ 
      $.get("/rightanswer", function(data, status){
         setTimeout(loadNewQuestion, 500);
     });
    }else{
      setTimeout(loadNewQuestion, 500);
    }
    
    
 
  }else{
    $('#'+indexClicked).removeClass("btn-primary");
    $('#'+indexClicked).addClass("btn-danger");
    $('#'+indexClicked).attr("disabled", "disabled");
    
    //update score display
    var scoreString = $("#score").text();
    var score = parseFloat(scoreString)-1;
    $("#score").text(score);

    //only make call to server if logged in
    if(loggedIn){
      $.get("/wronganswer", function(data, status){});
    }
  }

}
