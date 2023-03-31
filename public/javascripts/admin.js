$(function(){
  console.log("admin.js loaded");
      //resizeTextArea($("#quizQuestionQuestion"));
      resizeTextArea($("#quizQuestionQuestion"));
  var qIdToEdit = 0;
  var jIdToEdit = 0;
  var sIdToEdit = 0;

});

//admin clicked the edit user button
function editUserClicked(indexClicked){
  var admin = $("#selectadmin"+indexClicked).val();
  var editQuestions = $("#selecteditQuestions"+indexClicked).val();
  var viewReports = $("#selectviewReports"+indexClicked).val();
  var editUsers = $("#selecteditUsers"+indexClicked).val();
  var userID = $("#selectid"+indexClicked).text();
  //alert(userID);
  $.get("/edituser/"+userID+"/"+admin+"/"+editQuestions+"/"+viewReports+"/"+editUsers, function(data, status){
    //alert(status);
    if(data.status == "error"){
      $("#usersMessage").text(data.message);
      $("#usersMessage").removeClass("displayNone");
      $("#usersMessage").removeClass("alert-success");
      $("#usersMessage").addClass("alert-danger");
    }else if(data.status == "success"){
      $("#usersMessage").text(data.message);
      $("#usersMessage").removeClass("alert-danger");
      $("#usersMessage").removeClass("displayNone");
      $("#usersMessage").addClass("alert-success");
    }else{
      $("#usersMessage").text("Error "+status );
      $("#usersMessage").removeClass("displayNone");
      $("#usersMessage").removeClass("alert-success");
      $("#usersMessage").addClass("alert-danger");
    }
  });
}



//admin clicked the remove report button
function removeReportClicked(indexClicked){
  var questionIdToRemove = $("#row"+indexClicked).find("#questionIdToRemove").text();
  $.get("/removereport/"+questionIdToRemove, function(data, status){
    if(data.status == "error"){
      $("#reportsMessage").text(data.message);
      $("#reportsMessage").removeClass("alert-success");
      $("#reportsMessage").removeClass("displayNone");
      $("#reportsMessage").addClass("alert-danger");
    }else{
      $("#row"+indexClicked).remove();
      $("#reportsMessage").text(data.message);
      $("#reportsMessage").removeClass("alert-danger");
      $("#reportsMessage").removeClass("displayNone");
      $("#reportsMessage").addClass("alert-success");
    }
  });
}

//admin clicked the edit question button
function editQuestionClicked(type, id){
  if(type == "quizQuestion"){
    $("#qIdInput").val(id);
    displayQuizQuestionClicked();
  }else if(type == "jQuestion"){
    $("#jIdInput").val(id);
    displayJQuestionClicked();
  }else if(type == "stanfordQuestion"){
    $("#sIdInput").val(id);
    displayStanfordQuestionClicked();
  }
}


function displayStanfordQuestionClicked(){
  var id = $("#sIdInput").val();

  if(id == ""){
      $("#stanfordQuestionMessage").text("ID Not Valid");
      $("#stanfordQuestionMessage").removeClass("alert-success");
      $("#stanfordQuestionMessage").removeClass("displayNone");
      $("#stanfordQuestionMessage").addClass("alert-danger");
      return;
  }

  $.get("/stanfordquestiondisplay/"+id, function(data, status){
    if(data.status == "error"){
      $("#stanfordQuestionMessage").text(data.message);
      $("#stanfordQuestionMessage").removeClass("alert-success");
      $("#stanfordQuestionMessage").removeClass("displayNone");
      $("#stanfordQuestionMessage").addClass("alert-danger");
    }else{
      $("#stanfordQuestionMessage").text(data.message);
      $("#stanfordQuestionMessage").removeClass("alert-danger");
      $("#stanfordQuestionMessage").removeClass("displayNone");
      $("#stanfordQuestionMessage").addClass("alert-success");

      $("#stanfordQuestionQuestion").val(data.question[0].question);
      $("#stanfordQuestionCategory").val(data.question[0].category);
      $("#stanfordQuestionAnswer").val(data.question[0].answer);
      sIdToEdit = data.question[0]._id;

      resizeTextArea($("#stanfordQuestionQuestion"));
      //alert("question: " + data.question[0].raw);
    }
  });
}


function displayJQuestionClicked(){
  var id = $("#jIdInput").val();

  if(id == ""){ 
      $("#jQuestionMessage").text("ID Not Valid");
      $("#jQuestionMessage").removeClass("alert-success");
      $("#jQuestionMessage").removeClass("displayNone");
      $("#jQuestionMessage").addClass("alert-danger");
      return;
  }

  $.get("/jquestiondisplay/"+id, function(data, status){
    if(data.status == "error"){
      $("#jQuestionMessage").text(data.message);
      $("#jQuestionMessage").removeClass("alert-success");
      $("#jQuestionMessage").removeClass("displayNone");
      $("#jQuestionMessage").addClass("alert-danger");
    }else{
      $("#jQuestionMessage").text(data.message);
      $("#jQuestionMessage").removeClass("alert-danger");
      $("#jQuestionMessage").removeClass("displayNone");
      $("#jQuestionMessage").addClass("alert-success");

      $("#jQuestionQuestion").val(data.question[0].question);
      if(data.question[0].iptc_category){
        $("#jQuestionCategory").val(data.question[0].iptc_category);
      }else{
        $("#jQuestionCategory").val(data.question[0].category);
      }
      
      $("#jQuestionAnswer").val(data.question[0].answer);
      jIdToEdit = data.question[0]._id;

      if(data.question[0].explaination){
        $("#jQuestionExplaination").val(data.question[0].explaination);
      }

      // check if wrongAnswers exist.
      if(data.question[0].wrongAnswers){

        // wrong answers exists, lets loop through it, adding it to the correct textbox
        for(index in data.question[0].wrongAnswers){
          var wrongAnswer = data.question[0].wrongAnswers[index];
          $("#jQuestionWrongAnswers" + index).val(wrongAnswer);

        }
      }

      resizeTextArea($("#jQuestionQuestion"));
      //alert("question: " + data.question[0].raw);
    }
  });
}

function displayQuizQuestionClicked(){
  var id = $("#qIdInput").val();

  if(id == ""){
      $("#quizQuestionMessage").text("ID Not Valid");
      $("#quizQuestionMessage").removeClass("alert-success");
      $("#quizQuestionMessage").removeClass("displayNone");
      $("#quizQuestionMessage").addClass("alert-danger");
      return;
  }


  $.get("/quizquestiondisplay/"+id, function(data, status){
    if(data.status == "error"){
      $("#quizQuestionMessage").text(data.message);
      $("#quizQuestionMessage").removeClass("alert-success");
      $("#quizQuestionMessage").removeClass("displayNone");
      $("#quizQuestionMessage").addClass("alert-danger");
    }else{
      $("#quizQuestionMessage").text(data.message);  
      $("#quizQuestionMessage").removeClass("alert-danger");
      $("#quizQuestionMessage").removeClass("displayNone");
      $("#quizQuestionMessage").addClass("alert-success");

      $("#quizQuestionQuestion").val(data.question[0].raw);
      $("#quizQuestionCategory").val(data.question[0].category);
      $("#quizQuestionAnswer").val(data.question[0].label);
      qIdToEdit = data.question[0]._id;      

      resizeTextArea($("#quizQuestionQuestion"));
      //alert("question: " + data.question[0].raw);
    }
  });
}

function editQuizQuestionClicked(){
  var category = $("#quizQuestionCategory").val();
  var raw = $("#quizQuestionQuestion").val();
  var label = $("#quizQuestionAnswer").val();
  $.ajax({
        type: "POST",
        url: "/quizquestionedit",
        data:{ 
          id: qIdToEdit,
          category: category,
          raw: raw,
          label: label
        }, 
        success: function(data){
            if(data.status == "error"){
              $("#quizQuestionMessage").text(data.message);
              $("#quizQuestionMessage").removeClass("alert-success");
              $("#quizQuestionMessage").removeClass("displayNone");
              $("#quizQuestionMessage").addClass("alert-danger");
            }else{
              $("#quizQuestionMessage").text(data.message);  
              $("#quizQuestionMessage").removeClass("alert-danger");
              $("#quizQuestionMessage").removeClass("displayNone");
              $("#quizQuestionMessage").addClass("alert-success");
            } 
        },
        error: function(err){
          $("#quizQuestionMessage").text(err);
          $("#quizQuestionMessage").removeClass("alert-success");
          $("#quizQuestionMessage").removeClass("displayNone");
          $("#quizQuestionMessage").addClass("alert-danger");
        }
    });
}

function editJQuestionClicked(){
  var category = $("#jQuestionCategory").val();
  var question = $("#jQuestionQuestion").val();
  var answer = $("#jQuestionAnswer").val();
  var explaination = $("#jQuestionExplaination").val();

  // Get Wrong Answers from web interface
  var wrongAnswer0 = $("#jQuestionWrongAnswers0").val();
  var wrongAnswer1 = $("#jQuestionWrongAnswers1").val();
  var wrongAnswer2 = $("#jQuestionWrongAnswers2").val();
  var wrongAnswer3 = $("#jQuestionWrongAnswers3").val();
  var wrongAnswer4 = $("#jQuestionWrongAnswers4").val();
  var wrongAnswer5 = $("#jQuestionWrongAnswers5").val();
  var wrongAnswer6 = $("#jQuestionWrongAnswers6").val();
  var wrongAnswer7 = $("#jQuestionWrongAnswers7").val();
  var wrongAnswer8 = $("#jQuestionWrongAnswers8").val();
  var wrongAnswer9 = $("#jQuestionWrongAnswers9").val();
  var wrongAnswer10 = $("#jQuestionWrongAnswers0").val();
  

  
  $.ajax({
        type: "POST",
        url: "/jquestionedit",
        data:{
          id: jIdToEdit,
          category: category,
          question: question,
          answer: answer,
          explaination: explaination,
          wrongAnswer0: wrongAnswer0,
          wrongAnswer1: wrongAnswer1,
          wrongAnswer2: wrongAnswer2,
          wrongAnswer3: wrongAnswer3,
          wrongAnswer4: wrongAnswer4,
          wrongAnswer5: wrongAnswer5,
          wrongAnswer6: wrongAnswer6,
          wrongAnswer7: wrongAnswer7,
          wrongAnswer8: wrongAnswer8,
          wrongAnswer9: wrongAnswer9,
          wrongAnswer10: wrongAnswer10,
        },
        success: function(data){
            if(data.status == "error"){
              $("#jQuestionMessage").text(data.message);
              $("#jQuestionMessage").removeClass("alert-success");
              $("#jQuestionMessage").removeClass("displayNone");
              $("#jQuestionMessage").addClass("alert-danger");
            }else{
              $("#jQuestionMessage").text(data.message);
              $("#jQuestionMessage").removeClass("alert-danger");
              $("#jQuestionMessage").removeClass("displayNone");
              $("#jQuestionMessage").addClass("alert-success");
            }
        },
        error: function(err){
          $("#jQuestionMessage").text(err);
          $("#jQuestionMessage").removeClass("alert-success");
          $("#jQuestionMessage").removeClass("displayNone");
          $("#jQuestionMessage").addClass("alert-danger");
        }
    })
}


function editStanfordQuestionClicked(){
  var category = $("#stanfordQuestionCategory").val();
  var question = $("#stanfordQuestionQuestion").val();
  var answer = $("#stanfordQuestionAnswer").val();
  $.ajax({
        type: "POST",
        url: "/stanfordquestionedit",
        data:{
          id: sIdToEdit,
          category: category,
          question: question,
          answer: answer
        },
        success: function(data){
            if(data.status == "error"){
              $("#stanfordQuestionMessage").text(data.message);
              $("#stanfordQuestionMessage").removeClass("alert-success");
              $("#stanfordQuestionMessage").removeClass("displayNone");
              $("#stanfordQuestionMessage").addClass("alert-danger");
            }else{
              $("#stanfordQuestionMessage").text(data.message);
              $("#stanfordQuestionMessage").removeClass("alert-danger");
              $("#stanfordQuestionMessage").removeClass("displayNone");
              $("#stanfordQuestionMessage").addClass("alert-success");
            }
        },
        error: function(err){
          $("#stanfordQuestionMessage").text(err);
          $("#stanfordQuestionMessage").removeClass("alert-success");
          $("#stanfordQuestionMessage").removeClass("displayNone");
          $("#stanfordQuestionMessage").addClass("alert-danger");
        }
    })
}




function resizeTextArea($element) {
    $element.height(0);
    $element.height($element[0].scrollHeight);
}
