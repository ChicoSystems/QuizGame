$(function(){
  console.log("admin.js loaded");
      //resizeTextArea($("#quizQuestionQuestion"));
      resizeTextArea($("#quizQuestionQuestion"));
  var qIdToEdit = 0;
  var jIdToEdit = 0;

});


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
      $("#jQuestionCategory").val(data.question[0].category);
      $("#jQuestionAnswer").val(data.question[0].answer);
      jIdToEdit = data.question[0]._id;

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
  $.ajax({
        type: "POST",
        url: "/jquestionedit",
        data:{
          id: jIdToEdit,
          category: category,
          question: question,
          answer: answer
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


function resizeTextArea($element) {
    $element.height(0);
    $element.height($element[0].scrollHeight);
}
