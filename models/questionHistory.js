// app/models/questionHistory.js
// A record of how many times a user has answered a specific question
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var questionHistorySchema = mongoose.Schema({
    uid               : mongoose.Schema.Types.ObjectId,   //the object id of the user that answered
    type              : String,   //The collection the question is from
    qid               : mongoose.Schema.Types.ObjectId,   //The object id of the question
    wrongattempts   : Number,    //The number of times this question was attempted wrong
    rightattempts   : Number
},
{
  collection: 'questionHistory'
});

// create the model for quizQuestions and expose it to our app
module.exports = mongoose.model('questionHistory', questionHistorySchema);


