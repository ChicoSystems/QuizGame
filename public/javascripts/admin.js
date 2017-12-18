$(function(){
  console.log("admin.js loaded");
      //resizeTextArea($("#quizQuestionQuestion"));
      resizeTextArea($("#quizQuestionQuestion"));
  var idToEdit = 0;

});


function displayQuizQuestionClicked(){
  var id = $("#idInput").val();

  $.get("/quizquestion/"+id, function(data, status){
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
      idToEdit = data.question[0].id;      

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
          id: idToEdit,
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
    })
}

function resizeTextArea($element) {
    $element.height(0);
    $element.height($element[0].scrollHeight);
}
