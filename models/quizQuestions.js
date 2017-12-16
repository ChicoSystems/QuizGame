// app/models/quizQuestions.js
// questions from quiz bowl
// load the things we need
var mongoose = require('mongoose');
var random   = require('mongoose-simple-random');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var quizQuestionsSchema = mongoose.Schema({

    label            : String, //The answer to the question
    category         : String, //The category of the question
    raw              : String  //The Question itself

},
{
  collection: 'quizQuestions'
});

//add random ability to schema
quizQuestionsSchema.plugin(random);

// create the model for quizQuestions and expose it to our app
module.exports = mongoose.model('quizQuestions', quizQuestionsSchema);


