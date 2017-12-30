// app/models/stanfordQuestions.js
// questions from standford NLP Course
// load the things we need
var mongoose = require('mongoose');
var random   = require('mongoose-simple-random');

// define the schema for our user model
var stanfordQuestionsSchema = mongoose.Schema({
    id               : String,
    category         : String,   //The category of the question
    question         : String,   //The Question itself
    answer           : String   //The answer to the question
},
{
  collection: 'stanfordQuestions'
});

//add random ability to schema
stanfordQuestionsSchema.plugin(random);

// create the model for stanfordQuestions and expose it to our app
module.exports = mongoose.model('stanfordQuestions', stanfordQuestionsSchema);


