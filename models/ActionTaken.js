
var mongoose = require('mongoose');
var ContentModeration = require('./ContentModeration') ;
var bcrypt   = require('bcrypt-nodejs');

/**
 * The schema of a response, it has an attitutde, it has a prompt that
 * we used to create the reponse,. it has the text of the response.
 * and it has the output of openai moderation tool telling us
 * properties of the reponse.
 */
var responseSchema = mongoose.Schema({
  "attitude": String,
  "prompt": String,
  "text": String,
  "moderation" : ContentModeration.schema
});


/**
 * An action taken, has a type to reference when pulling up, a description for the
 * bot that generates it, and an array of possible reponses to that type of action taken.
 */
var actionTakenSchema = mongoose.Schema({
  "type": String,                             // The type of action that has been taken, ie correct_answer
  "quality": String,                          // the quality of the action taken, good, bad, poor, etc.
  "respondent": String,                       // The class of repondant that took this action, ie: player
  "description": String,                      // ie "player who just responsed with a correct answer"
  "responses": [responseSchema]
});






// create the model for users and expose it to our app
module.exports = mongoose.model('ActionTaken', actionTakenSchema);
//module.exports = mongoose.model('ActionTaken', actionTakenSchema);


