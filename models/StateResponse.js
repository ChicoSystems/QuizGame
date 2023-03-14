

/**
 * A State Response DB structure. We have a state, where a
 * proposition was given in a ceratin form. The proposition 
 * we generate using this structure is fed into generative
 * ai to come up with a response.
 * 
 * This allows us to structure a proposition in such a
 * way that we can instruct generative ai to give us
 * sensical responses which we can then save and retrive
 * in the future with the same calls we used to generate them
 */
var mongoose = require('mongoose');
var ContentModeration = require('./ContentModeration') ;
var bcrypt   = require('bcrypt-nodejs');


/**
 * Helps define the type of response.
 * The required state is a list of words that the caller will
 * use to generate the proposition. the required state tells us the keys
 * that are required by the stateREsponseSchema.state variable.
 */
var responseTypeSchema = mongoose.Schema(
    {
        requiredState: [String],          // The name of the required state variables for the given response type
        propositionForm: String               // The proposition formed with the elements of the required state.
                                          //     this is used as the input string for the generative ai.
    }
);

/**
 * propositionForm is a string with specific keys embedded in between #, such as #persona#
 * the passwed in propositionValues is a parallel array to our requiredState array, required state are they
 * keys that are in our proposition form. we need to replace any string in propositionForm that
 * matches #requiredState[value]# we will replace it will propositionValues[value].
 * The string that is built will be returned.
 * @param {} propositionValues 
 */
//responseTypeSchema.statics.generateProposition = 
    async function generateProposition(propositionForm, requiredState, propositionValues){
        
        // Get a copy of the proposition form, with #strings# for replacement in it.
        var returnVal = propositionForm;

        // Loop through the required state keys, matching them with the state values passed in
        for(s in requiredState){
            
            // get the state key
            var stateKey = requiredState[s];

            // check if the parallel value exists
            if(s < propositionValues.length){
                var stateValue = propositionValues[s];

                // we now have a state value and a matching state key, everything we need to replace #strings#
                returnVal = returnVal.replaceAll("#"+stateKey+"#", stateValue);


            }

        }

        // returnVal should now be a string with all #strings# replaced with their parallel value in proposition values
        return returnVal;
    }

const reponseTypeModel = mongoose.model("ResponseType", responseTypeSchema);


/**
 * The schema of a response, it has an attitutde, it has a prompt that
 * we used to create the reponse,. it has the text of the response.
 * and it has the output of openai moderation tool telling us
 * properties of the reponse.
 */
var responseObjectSchema = mongoose.Schema({
    "text": String,
    "moderation" : ContentModeration.schema
  });


/**
 * A state response schema
 */
var stateResponseSchema = mongoose.Schema(
    {
        responseType: responseTypeSchema,       // The schema of this state. Defines required state. Provides the form of the proposition   
        state: [String],                        // A state is made up of a list of variables, as defined in the states responseTypeScema
        proposition: String,
        responses: [responseObjectSchema]       // A list of objects representing the response of a generative ai, given the proposition.
    }
);

const stateResponseModel = mongoose.model("dontsaveme", stateResponseSchema); // don't save me because take shows up in mongodb

/**
 * Construct a new stateResponse Object witht the given data.
 * @param {*} propositionForm - The form of proposition this schema is designed to respond to. with #key# in the string instaed of values
 * @param {*} requiredStateKeys - An array of keys for our required state
 * @param {*} requiredStateValues - An array of values, matching the keys.
 * @param {*} callback - A callback function to call when the item is saved.
 */
stateResponseSchema.statics.createNew = 
    async function createNew(propositionForm, requiredStateKeys, requiredStateValues){

        // create the new response type you will save to the stateReponse
       /// var responseType = new responseTypeSchema.schema();
       var responseType = new reponseTypeModel();
        responseType.requiredState = requiredStateKeys;
        responseType.proposition = propositionForm;

        // Create the new state response you will save to the collection
        /////var stateResponse = new stateResponseSchema();
        var stateResponse = new stateResponseModel();
        stateResponse.responseType = responseType;

        // push requiredStateValues to the stateResponse.state array
        for(i in requiredStateValues){
            var rValue = requiredStateValues[i].toString();
            stateResponse.state.push(rValue);
        }

        // Loop through the input responses, adding them to the stateResponse.responses
        /*for(i in responses){
            var thisResponse = responses[i];

            // add this response to the object
            stateResponse.responses.push(thisResponse);
        }*/ /// add responses in lat4r?

        stateResponse.proposition = await generateProposition(propositionForm, requiredStateKeys, requiredStateValues);


        var stateResponseObject = new this(stateResponse);
        stateResponseObject.state = stateResponse.state;
        stateResponseObject.responseType = responseType;
        stateResponseObject.responses = stateResponse.responses;
        //Do stuff (parse item)

        try{
            await (stateResponseObject).save();
        }catch(error){
            console.log(error);
        }
        
        return stateResponseObject;
    }


stateResponseSchema.statics.responseObjectSchema = responseObjectSchema;

// create the model for users and expose it to our app
module.exports = mongoose.model('StateResponse', stateResponseSchema);
//module.exports = mongoose.model('ResponseType', responseTypeSchema);
//module.exports = mongoose.model('ActionTaken', actionTakenSchema);


