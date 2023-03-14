

/**
 * A personality response DB, allowing us to get responses from
 * the db, [persona][respondent][action][attitude][response]
 */
var mongoose = require('mongoose');
var ActionTaken = require('./ActionTaken') ;
var bcrypt   = require('bcrypt-nodejs');




var personaSchema = mongoose.Schema({
    type: String,          // The type of the persona           // A game show host
    description: String,   // A description of the persona
    actions: [ActionTaken.schema]
})


// create the model for users and expose it to our app
module.exports = mongoose.model('PersonalityResponse', personaSchema);
//module.exports = mongoose.model('ActionTaken', actionTakenSchema);


