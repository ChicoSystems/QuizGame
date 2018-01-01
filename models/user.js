// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var historySchema = mongoose.Schema({
  type          : String,
  qid           : mongoose.Schema.Types.ObjectId,
  wrongattempts : Number,
  rightattempts : Number
});

// define the schema for our user model
var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String,
    },
    facebook         : {
        id           : String,
        token        : String,
        name         : String,
        email        : String,
        photo        : String
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String,
        photo        : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String,
        photo        : String
    },
    gameinfo        : {
      score         : {type: Number, default: 0}
    },
    permissions     : {
      admin         : {type: Boolean, default: false},
      editQuestions : {type: Boolean, default: false},
      viewReports   : {type: Boolean, default: false},
      editUsers     : {type: Boolean, default: false}
    },
    questionHistory : [historySchema]

});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);


