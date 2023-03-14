var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

/**
 * The schema of the content moderation api from open ai
 * This will tell us what the open ai content moderation
 * things of text we've put through it. We can rank our
 * responses based on any of the category_scores
 */
var contentModerationSchema = mongoose.Schema({
    "id": String,
    "model": String,
    "results": [
      {
        "categories": {
          "hate": {type: Boolean, default: false},
          "hate/threatening": {type: Boolean, default: false},
          "self-harm": {type: Boolean, default: false},
          "sexual": {type: Boolean, default: false},
          "sexual/minors": {type: Boolean, default: false},
          "violence": {type: Boolean, default: false},
          "violence/graphic": {type: Boolean, default: false}
        },
        "category_scores": {
          "hate": mongoose.Decimal128,
          "hate/threatening": mongoose.Decimal128,
          "self-harm": mongoose.Decimal128,
          "sexual": mongoose.Decimal128,
          "sexual/minors": mongoose.Decimal128,
          "violence": mongoose.Decimal128,
          "violence/graphic": mongoose.Decimal128
        },
        "flagged": {type: Boolean, default: false}
      }
    ]
  });






// create the model for users and expose it to our app
module.exports = mongoose.model('ContentModeration', contentModerationSchema);
//module.exports = mongoose.model('ActionTaken', actionTakenSchema);


