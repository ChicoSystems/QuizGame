$(function(){
  //onload

  //make correct question difficulty radio button selected
  $('#dif'+difficulty).attr('checked', true);

});

//user clicked a question in the question history table
//call the server, ask for question text and display it under question
function questionClicked(qtype, qid){
  //alert("questionClicked("+qid+")");
  //first we query server for question text

  var url = "";
  if(qtype == "stanfordQuestion"){
    url = "/stanfordquestiondisplay/"+qid;
  }else if(qtype == "jQuestion"){
    url = "/jquestiondisplay/"+qid;
  }else if(qtype == "quizQuestion"){
    url = "/quizquestiondisplay/"+qid;
  }

  $.get(url, function(data, status){
    if(status == "success"){
      if(data.status == "success"){
        var questionText = '';
        var answerText = '';
        if(qtype == "quizQuestion"){
          questionText = data.question[0].raw;
          answerText = data.question[0].label;
        }else{
          questionText = data.question[0].question;
          answerText = data.question[0].answer;
        }
        $("#"+qid+" div.questionText").text(questionText);
        $("#"+qid+" div.answerText").text(answerText);
        //then we show question text
        $("#"+qid).toggleClass("collapsed");
      }else{
        alert("question not loaded");
      }
    }else{
        alert("question not loaded2");
    }
  });


}


//user clicked the reset score button
function resetClicked(){
  $.get("/resetscore", function(data, status){
    $("#resetmessage").removeClass('displayNone');
    $("#resetmessage").text(data.message + " to " + data.score); 
  });
}

//user clicked the delete question history button
function deleteQuestionsClicked(){
  $.get("/deletequestionhistory", function(data, status){
    $("#resetmessage").removeClass('displayNone');
    $("#resetmessage").text(data.message);
    $("#questionHistoryBody").addClass('displayNone'); 
    $("#qpct").text('0%'); 
  });
}

//user clicked the set difficulty button
function setDifficulty(){
  //var newdif = $('#dif'+difficulty).val();
  var newdif = $('input[name=optradio]:checked').attr('dif');

  $.get("/setdifficulty/"+newdif, function(data, status){ 
    $("#resetmessage").removeClass('displayNone');
    $("#resetmessage").text(data.message);
  });

}
