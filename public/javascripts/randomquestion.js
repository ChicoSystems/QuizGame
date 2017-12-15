$(function(){
  console.log("answerIndex: " + answerIndex);
});

function answerClicked(indexClicked){
  //alert("clicked answer: " + indexClicked);
  if(indexClicked == answerIndex){
    $('#'+indexClicked).removeClass("btn-primary");
    $('#'+indexClicked).addClass("btn-success");
    
  }else{
    $('#'+indexClicked).removeClass("btn-primary");
    $('#'+indexClicked).addClass("btn-danger");

  }
}
