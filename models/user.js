// app/models/user.js
// load the things we need
// To access a subcategory stat
// user.categoryTracker['catName'].subcategories['subcatname'].stats.attemptsWrong
// or a parent category stat:
//user.categoryTracker['catName].stats.attemptsTotal; etc

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var historySchema = mongoose.Schema({
  type          : String,
  qid           : mongoose.Schema.Types.ObjectId,
  wrongattempts : Number,
  rightattempts : Number
});

var categoryStatsSchema = mongoose.Schema({
    attemptsTotal            : Number,
    attemptsCorrect          : Number,
    attemptsWrong            : Number
});
const CategoryStatsModel = mongoose.model("CategoryStatsSchema", categoryStatsSchema);

var subcategoryTrackerSchema = mongoose.Schema({
    name            : String,
    stats           : categoryStatsSchema
});
const SubCategoryTrackerModel = mongoose.model("SubCategoryTrackerSchema", subcategoryTrackerSchema);

var categoryTrackerSchema = mongoose.Schema({
    name            : String,
    stats           : categoryStatsSchema,
    subcategories   : {type: Map, of: subcategoryTrackerSchema}
});
const CategoryTrackerModel = mongoose.model("CategoryTrackerSchema", categoryTrackerSchema);

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
    discord         : {
        id          : String,
        username    : String,
        tag         : String,
        photo       : String
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
    questionHistory : [historySchema],
    difficulty      : {type: Number, default: 2},
    categoryTracker : {type: Map, of: categoryTrackerSchema } 

});

userSchema.statics.createNewCategoryTracker = 
    async function createNewCategoryTracker(){
        return new Map();
    }

userSchema.statics.createNewCategoryTrackerSchema = 
    async function createNewCategoryTrackerSchema(newName){
        var category_tracker = new CategoryTrackerModel();
        category_tracker.name = newName;
    
        return category_tracker;
    }

    
userSchema.statics.createNewSubCategoryTrackerSchema = 
    async function createNewSubCategoryTrackerSchema(newName){
        var subcategory_tracker = new SubCategoryTrackerModel();
        subcategory_tracker.name = newName;
        return subcategory_tracker;
    }

    /**
     * 
     * @returns Constructs a new category stats model
     */
userSchema.statics.createNewCategoryStatsSchema = 
    async function createNewCategoryStatsSchema(){
        var catStats = new CategoryStatsModel();

        // set all the cat stats to 0
        catStats.attemptsCorrect = 0;
        catStats.attemptsTotal = 0;
        catStats.attemptsWrong = 0;

        return catStats;

    }

    

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


