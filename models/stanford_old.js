// app/models/jQuestions.js
// questions from quiz bowl
// load the things we need
var mongoose = require('mongoose');

var answersSchema = mongoose.Schema({
  answer_start      : Number,
  text              : String
});

var qasSchema = mongoose.Schema({
  answers           : [answersSchema],
  question          : String
});

var contextSchema = mongoose.Schema({
  context           : String,
  qas               : [qasSchema]
});

var paragraphSchema = mongoose.Schema({
  paragraphs        : [contextSchema]
});

var categorySchema = mongoose.Schema({
  title             : String,
  paragraphs        : [contextSchema]
  //aparagraphs        : [paragraphSchema]
});

var dataSchema = mongoose.Schema({
  data              :[categorySchema]
});

/*
// define the schema for our user model
var stanford_oldSchema = mongoose.Schema({
    _id               : String,
    data    : [dataSchema],   //The neural network generated subdiscipline category
},
{
  collection: 'stanford_old'
});
*/

var stanford_oldSchema = mongoose.Schema({
  title: String,
  paragraphs : [contextSchema]
},
{
  collection: 'stanford_old'
});

// create the model for quizQuestions and expose it to our app
module.exports = mongoose.model('stanford_old', stanford_oldSchema);


