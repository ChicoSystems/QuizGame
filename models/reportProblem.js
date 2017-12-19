// app/models/reportProblem.js
// user reports of question problems

// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var reportProblemsSchema = mongoose.Schema({
    id               : String,   //The category of the question
    problem          : String,   //The Question itself
    questionType     : String,   //The answer to the question
},
{
  collection: 'reportProblems'
});

//add random ability to schema
jQuestionsSchema.plugin(random);

// create the model for quizQuestions and expose it to our app
module.exports = mongoose.model('reportProblems', reportProblemsSchema);


