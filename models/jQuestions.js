// app/models/jQuestions.js
// questions from quiz bowl
// load the things we need
var mongoose = require('mongoose');
//var random   = require('mongoose-random');

// define the schema for our user model
var jQuestionsSchema = mongoose.Schema({
    id               : String,
    category         : String,   //The category of the question
    question         : String,   //The Question itself
    answer           : String,   //The answer to  the question
    discipline       : String,   //The neural network generated discipline category
    subDiscipline    : String,   //The neural network generated subdiscipline category
    oldQuestion      : String,   // The original question, after it is changed by gpt
    explaination     : String,   // A generated explaination for why the answer is correct
    iptc_category    : String,   // the iptc generated category for this quesiton meaningcloud.com
    iptc_subCategory : String, 
    value            : String,
    wrongAnswers     : [String], // The wrong answers generated by chatgpt
},
{
  collection: 'jQuestions'
});

//add random ability to schema
//jQuestionsSchema.plugin(random);

// create the model for quizQuestions and expose it to our app
module.exports = mongoose.model('jQuestions', jQuestionsSchema);


