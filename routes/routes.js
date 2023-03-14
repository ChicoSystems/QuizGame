// routes/routes.js

//used by socket.io to allow client to connect to server, this must change
//if domain changes, or when we move from dev server to live
//var hostedAddress = "http://192.168.1.197";
var hostedAddress = "http://quiz.chicosystems.com"; //  no port
var CHAT_GPT_MODERATION_ADDRESS = "https://api.openai.com/v1/moderations";

// load up the quizQestions model
var QuizQuestion            = require('../models/quizQuestions');
var Users                   = require('../models/user');
var JQuestion               = require('../models/jQuestions');
var ReportProblem           = require('../models/reportProblem');
var PersonalityResponse           = require('../models/PersonalityResponse');
var ContentModeration = require('../models/ContentModeration') ;
var ActionTaken = require('../models/ActionTaken') ;
var StateResponse = require('../models/StateResponse') ;
//var QuestionHistory         = require('../models/questionHistory');
var ObjectId                = require('mongoose').Types.ObjectId;
var util = require('util');
var fetch = require('node-fetch');

const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: "org-vVcrP7At2k89pbLet9QZgjgu"
});

const openai = new OpenAIApi(configuration);
//const axios = require("axios"); // http requests


//convert stanford questions
var s_old_questions = require('../models/stanford_old');
var StanfordQuestion        = require('../models/stanfordQuestions');

//random weighted choice, used for difficulty settings
var rwc                     = require('random-weighted-choice');
var rwc0 = [
  {weight: 94, id: 0},
  {weight: 5, id: 1},
  {weight: 1, id: 2}
];

var rwc1 = [
  {weight: 79, id: 0},
  {weight: 20, id: 1},
  {weight: 1, id: 2}
];

var rwc2 = [
  {weight: 48, id: 0},
  {weight: 48, id: 1},
  {weight: 2, id: 2}
];

var rwc3 = [
  {weight: 20, id: 0},
  {weight: 60, id: 1},
  {weight: 20, id: 2}
];

var rwc4 = [
  {weight: 5, id: 0},
  {weight: 90, id: 1},
  {weight: 5, id: 2}
];

var rwcTable = [];
rwcTable.push(rwc0);
rwcTable.push(rwc1);
rwcTable.push(rwc2);
rwcTable.push(rwc3);
rwcTable.push(rwc4);

module.exports = function(app, passport){
  //=============================================
  //Stanford Question Conversions
  //============================================
/*  app.get('/convertStanford', function(req, res){
    s_old_questions.find({}, function(err, result){
      if(err){
        res.send({status: "error", message: err});
      }else if(result == ""){
        res.send({status: "error", message: "Question :"+req.params.id+" does not exist!"});
      }else{
        //console.log("question: " + result);
        console.log("length: " +result.length);
        console.log(result[1].title);
        res.send(result[1]);
        for(var i = 0; i < result.length; i++){
          var category = result[i].title;
          category = category.replace(/_/g, " "); //replace _ with space
          console.log("category: " + category);
          for(var j = 0; j < result[i].paragraphs.length; j++){
             // console.log(result[i].paragraphs[j].qas.length);
            for(var k = 0; k < result[i].paragraphs[j].qas.length; k++){
              if(category == null || 
                 result[i].paragraphs[j].qas[k].question == null || 
                 result[i].paragraphs[j].qas[k].answers[0] == null){
                 console.log("something is null");
                //do nothing for this question, something is null
              }else{
                var question = result[i].paragraphs[j].qas[k].question;
                var answer =   result[i].paragraphs[j].qas[k].answers[0].text;
                //record this question into new db
                console.log("Category: " + category + " - Answer: " + answer + " - Question: " + question);            
                var stanfordQuestion = new StanfordQuestion();
                stanfordQuestion.category = category;
                stanfordQuestion.question = question;
                stanfordQuestion.answer = answer;
                stanfordQuestion.save();
              }
            }
          }
        }
      }
    });
 
  });
*/

  //==============================================
  //Game Routes
  //==============================================

  app.get('/sockettest', function(req, res){
    res.render('socketTest.ejs', {title: "Quiz Game Socket Test"});
  });

  app.get('/designtest', function(req, res){
    functionTest();
    res.render('designTest.ejs', {title : "Quiz Game"});
  });

  app.get('/privacy', function(req, res){
    res.render('privacy.ejs', {
      title : "Quiz Game - Privacy",
      user : req.user  
    });
  });

  app.get('/designtest2', function(req, res){
    res.render('designTest2.ejs', {title : "Quiz Game"});
  });

  app.get('/jquestion', function (req, res){
    renderJQuestion(req, res);
  });


  /**
   * Hits up the chat gpt moderation api to get a moderation
   * object, telling how this is classified for violence and unpleasantness.
   * @param {*} input // The string we are classifying
   * @returns // the open ai classfication object
   */
  async function chatGPTModeration(inputList){

    // create an empty moderation list
    var returnModerationList = [];

    // build the request address to match the backend api point
    var REQUEST_ADDRESS = encodeURI(CHAT_GPT_MODERATION_ADDRESS);

    // Loop through the input list, send a moderation request for every item
    //for(i in inputList){
     // var input = inputList[i];

      

      API_URL = `https://api.openai.com/v1/moderations`

      const headers = 
      {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      };

      try{
        const moderator = await fetch(API_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
          input: inputList,
        }),
      });

        const data = await moderator.json();

        // loop through data results, pushing to returnarray
        for(d in data.results){
          var modresult = data.results[d];
          returnModerationList.push(modresult);
        }
      }catch(error){
        console.log("error in moderation " + error);
      }

      

    

    // Return our returned http value.
    return returnModerationList;
  }


  

  async function generateChatGPTResponsesWithModeration(inputSentence, numResponsesToGenerate){

    // A data structure to hold our generated responses
    var returnResponses = [];

    // Make a chat gpt api call.
    var chatGPTReponses = await chatGPT2(inputSentence, numResponsesToGenerate);   // this is an array of new responses.
    
    // Run the output through chatgpt's moderation tool
    var openAPIModerationObject = await chatGPTModeration(chatGPTReponses); // this is an array of moderation objects

    for(r in chatGPTReponses){
      var newResponse = chatGPTReponses[r];

      // get the moderation object from the api
      var newModerationObject = openAPIModerationObject[r];

      // create the matching object for the database
      var contentModerationObject = new ContentModeration();

      //contentModerationObject._id = newModerationObject.id;
      contentModerationObject.model = "moderation-normal";
      contentModerationObject.results = newModerationObject;
      

      var response = {
        "text": newResponse,
        "moderation" : contentModerationObject
      }

      // add this new response to our data structure.
      returnResponses.push(response);
    }
    return returnResponses;
  }


  /**
   * Generate a new response object via chat gpt, and check it with the moderation api
   * @param {*} persona 
   * @param {*} respondent 
   * @param {*} action 
   * @param {*} actionQuality 
   * @param {*} attitude 
   * @returns 
   */
  async function generateNewResponses(persona, respondent, action, actionQuality, attitude){
    // A data structure to hold our generated responses
    var returnResponses = [];

    // Create a chat gpt prompt with the url data
    var chatGPTInput = "Pretend You are a " + attitude + " " + persona + " responding to a " + respondent + " named [name] who just " + action + " " + actionQuality + ". " +
        "Repond to them with a " + attitude + " attitude. ";

        ///'/personalityresponse/generate/:persona/:respondent/:action/:actionQuality/:attitude'
        ////personalityresponse/generate/Game%20Show%20Host/Player/answered%20a%20question/with%20skill/snarky

    // Make a chat gpt api call.
    var chatGPTReponses = await chatGPT2(chatGPTInput);   // this is an array of new responses.
    
    // Run the output through chatgpt's moderation tool
    var openAPIModerationObject = await chatGPTModeration(chatGPTReponses); // this is an array of moderation objects

    for(r in chatGPTReponses){
      var newResponse = chatGPTReponses[r];

      // get the moderation object from the api
      var newModerationObject = openAPIModerationObject[r];

      // create the matching object for the database
      var contentModerationObject = new ContentModeration();

      //contentModerationObject._id = newModerationObject.id;
      contentModerationObject.model = "moderation-normal";
      contentModerationObject.results = newModerationObject;
      

      var response = {
        "attitude": attitude,
        "prompt": chatGPTInput,
        "text": newResponse,
        "moderation" : contentModerationObject
      }

      // add this new response to our data structure.
      returnResponses.push(response);
    }
    return returnResponses;
  }


  /**
   * Create an action taken that matches what in the db under persona
   * @param {*} action 
   * @param {*} actionQuality 
   * @param {*} respondent 
   * @param {*} description 
   * @param {*} newResponse 
   * @returns 
   */
  function generateNewAction(action, actionQuality, respondent, description, newResponses){
    var actionTaken = new ActionTaken();
    actionTaken.type = action;
    actionTaken.quality = actionQuality;
    actionTaken.respondent = respondent;
    actionTaken.description = description;
    actionTaken.responses = newResponses;

    /*var actionTaken = {
      type: action,                             // The type of action that has been taken, ie correct_answer
      quality: actionQuality,                          // the quality of the action taken, good, bad, poor, etc.
      respondent: respondent,                       // The class of repondant that took this action, ie: player
      description: description,                      // ie "player who just responsed with a correct answer"
      responses: newResponses
    };*/

    return actionTaken;
  }


  app.get('/stateresponse/test3', async function(req, res){
    // Prep the input data for our create New function
    var propositionForm = "Pretend You are a #attitude# #persona# responding to a #respondent# named [name] who just #action# #actionQuality#. " +
                         "Repond to them with a #attitude# attitude. ";
    var requiredStateKeys = ["persona", "attitude", "respondent", "action", "actionQuality"];
    var requireStateValues = ["Quiz Game Host", "snarky", "player", "answered a question wrongly", "confidently"];
    var numResponsesDesired = 10;

    //create a filter looking for stateresponses that have the required state keys and values
    var filterStateResponseBasedOnResponseTypeAndState =
    {
      'responseType.requiredState': {
        '$all': requiredStateKeys
      }, 
      'state': {
        '$all': requireStateValues
      }
    }


    var stateResponse = await StateResponse.findOne(filterStateResponseBasedOnResponseTypeAndState).exec();

    // If the state response doesn't exist, create it, other wise, use the one we found
    if(stateResponse == null){
      console.log("state response doesnt exist, lets create one");
      // call the create new on our state response object.
      stateResponse = await StateResponse.createNew(propositionForm, requiredStateKeys, requireStateValues);

    }


    try{
        // Get our chat gpt responses.
      var chatgptResponses = await generateChatGPTResponsesWithModeration(stateResponse.proposition, numResponsesDesired);
      

      var responseToReturn = [];

      // Loop throug these responses adding them to our stateResponse responses
      for(i in chatgptResponses){
        var thisResponse = chatgptResponses[i];
        stateResponse.responses.push(thisResponse);
        responseToReturn.push(thisResponse);
      }

      // save our new or edited stateResponse to the db..
      await stateResponse.save();
      res.json(responseToReturn);
    }catch(error){
      console.log("error probably with chatgpt api: " + error);
      res.json(error);
    }

    


    /*
        //filter to find a state Response from the db with a specfic responst type
        var filterStateResponseBasedOnResponseTypeAndState =
        {
          'responseType.requiredState': {
            '$all': [
              'persona', 'attitude', 'respondent', 'action', 'actionQuality'
            ]
          }, 
          'state': {
            '$all': [
              'Quiz Game Host', 'snarky', 'player', 'answered a question wrong', 'confidently'
            ]
          }
        }
    */
  });


  /**
   * Test our state response database, while getting live responses and putting them in db.
   */
  app.get('/stateresponse/test2', async function(req, res){
    // Prep the input data for our create New function
    var propositionForm = "Pretend You are a #attitude# #persona# responding to a #respondent# named [name] who just #action# #actionQuality#. " +
                         "Repond to them with a #attitude# attitude. ";
    var requiredStateKeys = ["persona", "attitude", "respondent", "action", "actionQuality"];
    var requireStateValues = ["Quiz Game Host", "snarky", "player", "answered a question wrong", "confidently"];
    var numResponsesDesired = 2;

    // call the create new on our state response object.
    var stateResponse = await StateResponse.createNew(propositionForm, requiredStateKeys, requireStateValues);


    var chatgptResponses = await generateChatGPTResponsesWithModeration(stateResponse.proposition, numResponsesDesired);
    stateResponse.responses = chatgptResponses;

    
    await stateResponse.save();
  });


  /**
   * Test the statereponse db
   */
  app.get('/stateresponse/test/', async function(req, res){
    // Prep the input data for our create New function
    var propositionForm = "Pretend You are a #attitude# #persona# responding to a #respondent# named [name] who just #action# #actionQuality#. " +
                         "Repond to them with a #attitude# attitude. ";
    var requiredStateKeys = ["persona", "attitude", "respondent", "action", "actionQuality"];
    var requireStateValues = ["Quiz Game Host", "snarky", "player", "answered a question wrong", "confidently"];

    // call the create new on our state response object.
    var stateResponse = await StateResponse.createNew(propositionForm, requiredStateKeys, requireStateValues, {});
    await stateResponse.save();




  });

  /**
   * Returns a reponse to the user, in a certain persona, reponsing to a certain responsend, who just
   * did a certain action, with a given attitude.
   * 
   * Calls chatgpt to generate, and logs the response into the server
   * /personalityresponse/generate/Game%20Show%20Host/Player/answered%20a%20question/with%20skill/snarky/
   */
  app.get('/personalityresponse/generate/:persona/:respondent/:action/:actionQuality/:attitude/', async function(req, res){
    
    // Get the data from the url
    var persona = req.params.persona;//.split(" ")[0]; // game show host, police office 
    var respondent = req.params.respondent;//.split(" ")[0];
    var action = req.params.action;//.split(" ")[0]; // should be in past sense, answered, responded, tested
    var actionQuality = req.params.actionQuality;//.split(" ")[0]; // answered badly, answered well, etc
    var attitude = req.params.attitude;//.split(" ")[0];



    var chatGPTResponse = "";

    

    // Query the db for this persona
    var filter = { type: `${persona}` };
    
    ////var filter = {type: {$eq: persona}};
    var fields = {};
    var resultPersona = await PersonalityResponse.findOne(filter, fields).exec();

    // Check the db for a persona of this type
    if(resultPersona && resultPersona != null){

      // A persona of this type has been found, check if we have the desired action under the persona
      // Loop through the actions of the persona
      var actionExists = false;
      var thisAction = null;
      for(a in resultPersona.actions){

        // Get the action
        thisAction = resultPersona.actions[a];

        // check if the actions type is
        if(thisAction.type == action){
          actionExists = true;
          break; // break out of the for loop once we find the action we are looking for.
        }

        // Check if we found an action in the previous for loop that matches the action we are looking for
        
      }
      // after for here
      if(actionExists){

        // we found an action that matches, not check, does a response that matches our desired attitude exist?
        var responseWithAttitudeExists = false;
        var responseWithAttitude = null;

        // Loop through the responses in this action
        for(r in thisAction._doc.responses){

          responseWithAttitude = thisAction._doc.responses[r];
          

          // check if the reponse has the desired attitude.
          if(responseWithAttitude.attitude == attitude){
            // A reponse with this attitude exists, we can use that, or we can generate a new one and add it
            
            // Get a random number 1 to 100;
            var random = Math.floor(Math.random() * 100);

            // 50/50 chance this will be under 50
            if(random < 50){

              var responseWithAttitudes = [];
              //filter reponses, to only have responses with the given attitude
              for(att in thisAction._doc.responses){
                if(thisAction._doc.responses[att].attitude == attitude){
                  responseWithAttitudes.push(thisAction._doc.responses[att])
                }
              }


              // get a random number to return a response
              random = Math.floor(Math.random() * responseWithAttitudes.length );
              
              // use the response we found in the db, no need to save anything
              chatGPTResponse = responseWithAttitudes[random];

              // break out of the for loop with this repsonse.
              break;
              
            }else{
              // create a new response
              var newResponses = await generateNewResponses(persona, respondent, action, actionQuality, attitude);

              // add this response to this action
              for(y in newResponses){
                thisAction._doc.responses.push(newResponses[y]);
              }
              

              // save this action back into the same place our persona was saved.
              resultPersona.actions[a] = thisAction;

              // save our changed persona to the db
              resultPersona.save();

              // get a random response from newResponses
              random = Math.floor(Math.random() * newResponses.length );

              // have our response returnable
              chatGPTResponse = newResponses[random];
              break;
            }

          }else{
            // A response with this attitude for this action does not exist, create one, add it to the action
              // create a new response
              var newResponses = await generateNewResponses(persona, respondent, action, actionQuality, attitude);


              // add this response to this action
              for(y in newResponses){
                thisAction._doc.responses.push(newResponses[y]);
              }
              

              // add this action to our actions
              resultPersona.actions[a] = thisAction;

              // save our changed persona to the db
              resultPersona.save();

              // get a random response from newResponses
              random = Math.floor(Math.random() * newResponses.length );

              // have our response returnable
              chatGPTResponse = newResponses[random];
              break;
          }
        }


      }else{
        // we did not find an action that matches, create an action and add it to the person found

        // create a new response
        var newResponses = await generateNewResponses(persona, respondent, action, actionQuality, attitude);

        // Create a new action with the response
        var newAction = generateNewAction(action, actionQuality, respondent, action, newResponses);

        // push this new action to our actions array in our persona we did find
        resultPersona.actions.push(newAction);

        // save our modified persona
        resultPersona.save();

        // get a random response from newResponses
        random = Math.floor(Math.random() * newResponses.length );

        // have our response returnable
        chatGPTResponse = newResponses[random];
      }

    }else{
      // A persona of this type has not been found, create a person, with the desired action, and add it to db
      
      // create the new persona from our db models.
      var newPersona = new PersonalityResponse();
      newPersona.type = persona;
      newPersona.description = persona;

      // create action array for new persona
      //newPersona.actions = [];

      // create a new response
      var newResponses = await generateNewResponses(persona, respondent, action, actionQuality, attitude);

       // Create a new action with the response
       var newAction = generateNewAction(action, actionQuality, respondent, action, newResponses);

      

       // push this new action to our actions array in our persona we did find
       //newPersona.actions.push(newAction);
       newPersona.actions = [newAction]

       // save our modified persona
       await newPersona.save();

       // get a random response from newResponses
       random = Math.floor(Math.random() * newResponses.length );

       // have our response returnable
       chatGPTResponse = newResponses[random];
    }

    res.json(chatGPTResponse);

  });

  app.get('/discord/question', async function(req, res){
    //res.send
    var jsonQuestion = await getDiscordQuestion(req, res);
    res.json(jsonQuestion);
  });

  app.get('/discord/question/auth/', passport.authenticate('discord-bot-login'), async function(req, res){
    //res.send
    var jsonQuestion = await getDiscordQuestion(req, res);
    res.json(jsonQuestion);
  });

  //reports a problem with a question to the admin
  app.get('/discord/reportQuestion', passport.authenticate('discord-bot-login'), function(req, res){
    var id = req.query.question_id;
    var problem = req.query.problem;
    var questionType = "jQuestion";
    var newProblem = new ReportProblem();
    newProblem.id = id;
    newProblem.problem = problem;
    newProblem.questionType = questionType;
    newProblem.reportedBy = req.query.discord_user_id;
    
    console.log("reporting problem: " + newProblem); 
 
    //save the new problem
    newProblem.save();
  });


  /**
   * A Backend Function for the discord quiz bot. Logs if a user got an answer correct/wrong in the db.
   * If the user had not existed previously they will be automatically authenticated with their discord
   * id and their question will be logged.
   * @param {*} isAnswerCorrect A boolean, true if their answer was correct, false if not.
   * @param {*} req The http request
   * @param {*} res The http response.
   */
  async function discordLogAnswer(isAnswerCorrect, req, res){
    var question_id = req.query.question_id;
    var user_id = req.query.discord_user_id;

    console.log("user: " + user_id + " got question wrong: " + question_id);

    var user = null;
    if(req.user){
      user = req.user;
    }else{
      user = await Users.findOne({ 'discord.id' :  user_id }).exec();
    }


    //if there is a user signed in update his history and score
    if(user && user != null){
      //var user = req.user;

      //find question in users question history
      var questionFound = false;
      var qIndex = null;
      var qidToFind = question_id;
      for(var i = 0; i < user.questionHistory.length; i++){
        //console.log(user.questionHistory[i]);
        if(user.questionHistory[i].qid == qidToFind &&
           user.questionHistory[i].type == "jQuestion"){
          questionFound = true;
          qIndex = i;
        }
      }

      //if question was found in question history, update it, otherwise create a new one
      if(questionFound){
        
        // Did the user just answer this question correctly?
        if(isAnswerCorrect){
          // The question was answered right, increase the number of right attempts for this question in the user's history.
          user.questionHistory[qIndex].rightattempts++;
        }else{
          // The answer was wrong, increase the number of wrong attempts for this question in the user's questions history.
          user.questionHistory[qIndex].wrongattempts++;
        }
      }else{
        // The the user has not previously answered this question.

        // create a newHistory struction
        var newHistory = {};

        // depending on if the user got the quetion right or wrong, change their wright attempt vs wrong attempt.
        if(isAnswerCorrect){
          newHistory = {
            type : "jQuestion",
            qid : question_id,
            wrongattempts: 0,
            rightattempts: 1
          };
        }else{
          newHistory = {
            type : "jQuestion",
            qid : question_id,
            wrongattempts: 1,
            rightattempts: 0
          };
        }
        
        user.questionHistory.push(newHistory);// = questionHistory;
      }

      // update the users game info.
      if(isAnswerCorrect){
        user.gameinfo.score++;
      }else{
        user.gameinfo.score--;
      }
      
      await user.save();

      //let front end know
      res.json({
        message: "ok",
        score  : user.gameinfo.score
      });
    }else{
      //user is not signed in, send error to client
      res.json({
        message: "error"
      });
    }
  }

  // The discord user clicked an answer correctly
  app.get('/discord/rightAnswer/auth', passport.authenticate('discord-bot-login'), async function(req, res){
    var isAnswerCorrect = true;

    // Log the users correct answer in the backend.
    discordLogAnswer(isAnswerCorrect, req, res);
  });

  //user clicked on a wrong answer
  app.get('/discord/wrongAnswer/auth', passport.authenticate('discord-bot-login'), async function(req, res){
    var isAnswerCorrect = false;

    // Log the users correct answer in the backend.
    discordLogAnswer(isAnswerCorrect, req, res);
  });


  //user clicked on a wrong answer
  app.get('/discord/wrongAnswer/:question_id/:user_id/:user_name', async function(req, res, done){
    var question_id = req.params.question_id;
    var user_id = req.params.user_id;
    var user_name = req.params.user_name;

    console.log("user: " + user_name + " got question wrong: " + question_id);

    var user = null;
    if(req.user){
      user = req.user;
    }else{
      user = await Users.findOne({ 'discord.id' :  user_id }).exec();
    }


    //if there is a user signed in update his history and score
    if(user && user != null){
      //var user = req.user;

      //find question in users question history
      var questionFound = false;
      var qIndex = null;
      var qidToFind = question_id;
      for(var i = 0; i < user.questionHistory.length; i++){
        //console.log(user.questionHistory[i]);
        if(user.questionHistory[i].qid == qidToFind &&
           user.questionHistory[i].type == "jQuestion"){
          questionFound = true;
          qIndex = i;
        }
      }

      //if question was found in question history, update it, otherwise create a new one
      if(questionFound){
        //the question was found at index qIndex, modify correct field
        user.questionHistory[qIndex].wrongattempts++;
      }else{
        //the question was not found, create a new one, and add it to user
        var newHistory = {
          type : "jQuestion",
          qid : question_id,
          wrongattempts: 1,
          rightattempts: 0
        };
        user.questionHistory.push(newHistory);// = questionHistory;
      }

      //update score, and save user back to db
      //////req.session.score = req.session.score - 1;
      //////user.gameinfo.score = req.session.score;
      user.gameinfo.score--;
      user.save();

      //let front end know
      res.send({
        message: "ok",
        score  : user.gameinfo.score
      });
    }else{
      //user is not signed in, send error to client
      res.send({
        message: "error"
      });
    }
  });


  app.get('/discord/scoreboard', async function(req, res, done){
    var fields = {"discord": 1, "gameinfo" : 1}; // query for the discord object, and the game info object
    var filter = {discord: {$exists: true}};     // filter for only discord users

    var results = await Users.find(filter, fields).sort('-gameinfo.score').exec();//function(err, results){
      //if(err) throw err;

      res.json(results)
      /*
      res.render('scoreboard.ejs',{
        title: "Quiz Game Scoreboard",
        results: results,
        user: req.user
      });
      */
    ////////});
  });


  /*app.get('/discord/question/', passport.authenticate('discord-bot-login'), async function(req, res){
    //res.send
    var jsonQuestion = await getDiscordQuestion(req, res);
    res.json(jsonQuestion);
  });*/

  //The main page, renders jquestion or quizquestion half time
  app.get('/', function(req, res){
    //set difficulty
    var difficulty = 2;
    if(req.user){
      difficulty = req.user.difficulty;
    }
    var random = rwc(rwcTable[difficulty]);

    /////if(random == 0){
      renderJQuestion(req, res);
      /////renderQuizQuestion(req, res);
    /*}else if(random == 1){
      renderQuizQuestion(req, res);
    }else{
      renderStanfordQuestion(req, res);
    }*/
  });

  //user clicked on a wrong answer
  app.get('/wronganswer/:questionType/:questionId', function(req, res, done){
    console.log("wronganswer");
    //if there is a user signed in update his history and score
    if(req.user){
      var user = req.user;

      //find question in users question history
      var questionFound = false;
      var qIndex = null;
      var qidToFind = req.params.questionId;//new ObjectId(req.params.questionId);
      for(var i = 0; i < user.questionHistory.length; i++){
        //console.log(user.questionHistory[i]);
        if(user.questionHistory[i].qid == qidToFind &&
           user.questionHistory[i].type == req.params.questionType){
          questionFound = true;
          qIndex = i;
        }
      }

      //if question was found in question history, update it, otherwise create a new one
      if(questionFound){
        //the question was found at index qIndex, modify correct field
        user.questionHistory[qIndex].wrongattempts++;
      }else{
        //the question was not found, create a new one, and add it to user
        var newHistory = {
          type : req.params.questionType,
          qid : req.params.questionId,
          wrongattempts: 1,
          rightattempts: 0
        };
        user.questionHistory.push(newHistory);// = questionHistory;
      }

      //update score, and save user back to db
      req.session.score = req.session.score - 1;
      user.gameinfo.score = req.session.score;
      user.save();

      //let front end know
      res.send({
        message: "ok",
        score  : req.session.score
      });
    }else{
      //user is not signed in, send error to client
      res.send({
        message: "error"
      });
    }
  });

  //user clicked on a right answer
  app.get('/rightanswer/:questionType/:questionId', function(req, res, done){
    //if user is logged in, update score and record question, otherwise send error message
    if(req.user){
      console.log("rightanswer");
      var user = req.user;
      
      //find question in users question history
      var questionFound = false;
      var qIndex = null;
      var qidToFind = req.params.questionId;

      //loop through question history
      for(var i = 0; i < user.questionHistory.length; i++){
        if(user.questionHistory[i].qid == qidToFind &&
           user.questionHistory[i].type == req.params.questionType){
          questionFound = true;
          qIndex = i;
        }
      }

      //if question was found, update, otherwise create new one
      if(questionFound){
        user.questionHistory[qIndex].rightattempts++;
      }else{
        var newHistory = {
          type : req.params.questionType,
          qid  : req.params.questionId,
          wrongattempts: 0,
          rightattempts: 1
        };
        user.questionHistory.push(newHistory);
      }

      //we decrease the score in the session and
      //update that score to the db
      req.session.score = req.session.score + 5;
      user.gameinfo.score = req.session.score;
      user.save();
      
      //let front end know
      res.send({
        message: "ok",
        score  : req.session.score
      });//end res.send
    }else{
      res.send({
        message: "error"
      });
    }
  });//end app.get

  app.get('/scoreboard', async function(req, res, done){
    var fields = {};
    var filter = {};

    var results = await Users.find(filter, fields, ).sort('-gameinfo.score').exec();//function(err, results){
      //if(err) throw err;

      res.render('scoreboard.ejs',{
        title: "Quiz Game Scoreboard",
        results: results,
        user: req.user
      });
    ////////});
  });

  //resets the score of the signed in user
  app.get('/resetscore', function(req, res, done){
    if(req.user){
      req.session.score = 0;
      req.user.gameinfo.score = 0;
      
      req.user.save();
      res.send({
        message: "Score Reset",
        score  : req.session.score
      });
    }
  });

  //deletes the question history of the signed in user
  app.get('/deletequestionhistory', function(req, res, done){
    if(req.user){
      req.user.questionHistory = [];
      req.user.save();
      res.send({
        message: "Question History Deleted"
      });
    }
  });

  //user sets the difficulty in their profile page
  app.get('/setdifficulty/:newdiff', function(req, res){
    if(req.user){
      req.user.difficulty = req.params.newdiff;
      req.user.save();
      res.send({message: "Successfully Changed Difficulty"});
    }else{
      res.send({message: "Error, not logged in, can't change difficulty"});
    }
  });

  app.get('/removereport/:id', function(req, res){
    if(req.user && req.user.permissions.admin && req.user.permissions.viewReports){

      ReportProblem.remove({ id: req.params.id }, function(err) {
        if (!err) {
          res.send({status: "success", message: "Report " + req.params.id + " removed!"});
        }else {
          res.send({status: "error", message: "Err: " + err});
        }
      });

    }else{
      res.send({status: "error", message: "User Does Not Have Permissions To Remove Report"});
    }
  });

  //reports a problem with a question to the admin
  app.post('/reportproblems', function(req, res){
    var id = req.body.id;
    var problem = req.body.problem;
    var questionType = req.body.questionType;
    var newProblem = new ReportProblem();
    newProblem.id = id;
    newProblem.problem = problem;
    newProblem.questionType = questionType;
    
    console.log("reporting problem: " + newProblem); 
 
    //save the new problem
    newProblem.save();
  });

  //lets client know if it is logged in, used by multiplayer
  app.get('/isloggedin', function(req, res){
    if(req.user){
      res.send("true");
    }else{
      res.send("false");
    }
  });

  //client playing multiplayer redeems their bonus
  app.post('/redeembonus', function(req, res){
    if(req.user){
      var bonus = parseInt(req.body.bonus);
      console.log("redeeming bonus of " + bonus);
      req.user.gameinfo.score = req.user.gameinfo.score + bonus;
      req.user.save();
    }else{
      console.log("can't redeem bonus for user not signed in");
    }
  });

  //=============================================
  // Admin Routes
  //============================================
  
  //admin page
  app.get('/admin', function(req, res){
    //check if user is an admin
    if(req.user && req.user.permissions.admin){
      ReportProblem.find({}, {}, function(err, results){
        if(err) throw err;
        //console.log(results);
  
        //get a list of all the users
        Users.find({}, {}, function(error, users){
          if(error)throw error;

          console.log("users: " + users);
          res.render('admin.ejs', {
            title: "Quiz Game Admin",
            user: req.user,
            users: users,
            reports: results
          });
        });
      });
    }else{
      res.redirect('/login');
    }
  });

  app.get('/edituser/:userID/:admin/:editQuestions/:viewReports/:editUsers', function(req, res){
    //check if user is an admin, and has editUsers permission
    if(req.user && req.user.permissions.admin && req.user.permissions.editUsers){
      //user has permissions, update the user given by id
      Users.findOne({_id: new ObjectId(req.params.userID)}, {}, function(err, results){
        console.log(results);
        results.permissions.admin = req.params.admin;
        results.permissions.editQuestions = req.params.editQuestions;
        results.permissions.viewReports = req.params.viewReports;
        results.permissions.editUsers = req.params.editUsers;
        results.save();
        res.send({status: "success", message: "user was found"});
      });
    }else{
      res.send({status: "error", message: "User Does Not Have Permission to Edit Users"});
    }
  });

  //gets a quiz question of given id, sends it to frontend
  app.get('/quizquestiondisplay/:id', function(req, res){
    if(req.params.id == "" || !ObjectId.isValid(req.params.id)){
         res.send({status: "error", message: "Question: "+req.params.id+" does not exist!"});
      return 0;
    }
    var query = { _id: new ObjectId(req.params.id) };
    QuizQuestion.find(query, function(err, result){
      if(err){
        res.send({status: "error", message: err});
      }else if(result == ""){
        res.send({status: "error", message: "Question :"+req.params.id+" does not exist!"});
      }else{
        //console.log("question: " + result);
        res.send({status: "success", message: "Success getting question: " + req.params.id, question: result});
      }
    });
    
  });


  //gets a jquestion of a given id, sends it to frontend
  app.get('/jquestiondisplay/:id', function(req, res){
    console.log("id: " + req.params.id);
    if(req.params.id == "" || !ObjectId.isValid(req.params.id)){
         res.send({status: "error", message: "Question: "+req.params.id+" does not exist!"});
      return 0;
    }
    var query = { _id: new ObjectId(req.params.id) };
    JQuestion.find(query, function(err, result){
      if(err){
         res.send({status: "error", message: err});
      }else if(result == ""){
         res.send({status: "error", message: "Question: "+req.params.id+" does not exist!"});
      }else{ 
        res.send({status: "success", message: "Success getting question: " + req.params.id, question: result});
      } 
    });
  });

  //gets a stanfordquestion of a given id, sends it to frontend
  app.get('/stanfordquestiondisplay/:id', function(req, res){
    console.log("id: " + req.params.id);
    if(req.params.id == "" || !ObjectId.isValid(req.params.id)){
         res.send({status: "error", message: "Question: "+req.params.id+" does not exist!"});
      return 0;
    }
    var query = { _id: new ObjectId(req.params.id) };
    StanfordQuestion.find(query, function(err, result){
      if(err){
         res.send({status: "error", message: err});
      }else if(result == ""){
         res.send({status: "error", message: "Question: "+req.params.id+" does not exist!"});
      }else{
        res.send({status: "success", message: "Success getting question: " + req.params.id, question: result});
      }
    });
  });


  app.post('/quizquestionedit', function(req, res){
    if(req.user && req.user.permissions.admin && req.user.permissions.editQuestions){
      //update the db
      //var query = {id: req.body.id};
      var query = { _id: new ObjectId(req.body.id) };
      QuizQuestion.findOne(query, function(err, doc){
        doc.category = req.body.category;
        doc.raw = req.body.raw;
        doc.label = req.body.label;
        doc.save();
        res.send({status: "success", message: "Question was Edited"});
      });
    }else{
      //user does not have permission
      res.send({status: "error", message: "User does not have permissions to edit questions!"});
    }

  });

  app.post('/jquestionedit', function(req, res){
    console.log("id: " + req.body.id);
    if(req.user && req.user.permissions.admin && req.user.permissions.editQuestions){
      //update the db
      var query = { _id: new ObjectId(req.body.id) };
      JQuestion.findOne(query, function(err, doc){
      console.log("doc " + doc);
        doc.category = req.body.category;
        doc.question = req.body.question;
        doc.answer = req.body.answer;
        doc.save();
        res.send({status: "success", message: "Question was Edited"});
      });
    }else{
      //user does not have permission
      res.send({status: "error", message: "User does not have permissions to edit questions!"});
    }

  });

  //front end submits stanfordquestionedit post
  app.post('/stanfordquestionedit', function(req, res){
    console.log("id: " + req.body.id);
    if(req.user && req.user.permissions.admin && req.user.permissions.editQuestions){
      //update the db
      var query = { _id: new ObjectId(req.body.id) };
      StanfordQuestion.findOne(query, function(err, doc){
      console.log("doc " + doc);
        doc.category = req.body.category;
        doc.question = req.body.question;
        doc.answer = req.body.answer;
        doc.save();
        res.send({status: "success", message: "Question was Edited"});
      });
    }else{
      //user does not have permission
      res.send({status: "error", message: "User does not have permissions to edit questions!"});
    }

  });

  //============================================
  // MultiPlayer Related Routes
  //============================================

  app.get('/lobby', function(req, res){
    //get userName
    var name = "guest"+ (Math.floor((Math.random() * 1000) + 1));

    if(req.user){
      if(req.user.facebook.name != null){
        name = req.user.facebook.name;
      }else if(req.user.twitter.username){
        name = req.user.twitter.username;
      }else if(req.user.google.name){
        name = req.user.google.name;
      }else if(req.user.local.email){
        name = req.user.local.email;
      }
    }
    var clientConnectTo = hostedAddress +":"+ app.server.address().port;
    if(req.user){
      res.render('lobby.ejs', {
        title: "Multi Player Lobby",
        serverIP: clientConnectTo,
        user    : req.user,
        name    : name,
        id      : req.user._id
      });
    }else{
      res.redirect('/login');
    } 
  });

  //==============================================
  //Social Login Routes
  //=============================================
  
  //Login Page
  app.get('/login', function(req, res){
    //render the page, and pass in flash data, if it exists
    res.render('login.ejs', {
      message: req.flash('loginMessage'),
      title: "Quiz Game Login"
    });
  });

  //process the login form
  app.post('/login', passport.authenticate('local-login',{
    successRedirect : '/',
    failureRedirect : '/login',
    failureFlash     : true
  }));

  //Signup Page
  app.get('/signup', function(req, res){
    res.render(
      'signup.ejs',{
        message: req.flash('signupMessage'),
        title: "Quiz Game Signup"
    });
  });

  //process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/', //redirect to secure profile section
    failureRedirect : '/signup',  //redirect to signup page with error
    failureFlash    : true        //allow flash messages
  }));

  //Profile Section
  // We want user logged in to visit
  // use route middleware to verify this (isLoggedIn function)
  app.get('/profile', isLoggedIn, function(req, res){

      res.render(
        'profile.ejs',{ 
          user: req.user,
          title: "Quiz Game - Profile"
        } //get the user out of session and pass to template
      );

  });

  //=========
  //Facebook routes
  //=========
  
  //route for facebook auth and login
  app.get('/auth/facebook', passport.authenticate('facebook', {
    scope : ['public_profile', 'email']
  }));

  //handle the callback after facebook has authenticated the user
  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
      successRedirect : '/',
      failureRedirect : '/login'
  }));

  //==============
  //Twitter Routes
  //==============
  
  //route for twitter auth and login
  app.get('/auth/twitter', passport.authenticate('twitter'));

  //handle the callback after twitter has auth'd the user
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
      successRedirect : '/',
      failureRedirect : '/login'    
  }));

  //=============
  //Google Routes
  //=============

  //route for google auth and login
  app.get('/auth/google', passport.authenticate('google', {
    scope : ['profile', 'email']
  }));

  //handle the callback after google has auth'd the user
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      successRedirect : '/',
      failureRedirect : '/login'
    }
  ));

  //===========================
  //Authorize (Already Logged In / Connecting Other Social Account
  //===========================

  //local connect
  app.get('/connect/local', function(req, res){
    res.render('connect-local.ejs', {message: req.flash('loginMessage')});
  });

  app.post('/connect/local', passport.authenticate('local-signup', {
    successRedirect : '/profile',
    failureRedirect : '/connect/local',
    failureFlash : true
  }));

  //facebook connect
  //send to facebook to do the auth
  app.get('/connect/facebook', passport.authorize('facebook', {
    scope: ['public_profile', 'email']
  }));

  //handle the callback after facebook has auth'd the user
  app.get('/connect/facebook/callback',
    passport.authorize('facebook', {
      successRedirect : '/profile',
      failureRedirect : '/'
  }));

  //twitter connect
  //send to twitter to do the auth
  app.get('/connect/twitter', passport.authorize('twitter', {scope: 'email'}));

  //handle the callback after twitter auth'd the user
  app.get('/connect/twitter/callback',
    passport.authorize('twitter', {
      successRedirect : '/profile',
      failureRedirect : '/'
  }));

  //google connect
  //send to google to do the auth
  app.get('/connect/google', passport.authorize('google', {scope :['profile', 'email']}));

  //callback after google auth'd user
  app.get('/connect/google/callback',
    passport.authorize('google', {
      successRedirect : '/profile',
      failureRedirect : '/'
  }));

  //==========================================
  //Unlink Routes
  //==========================================
  //for social accounts just remove token
  //for local account remote email and password

  //local unlink
  app.get('/unlink/local', function(req, res){
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function(err){
      res.redirect('/profile');
    });
  });

  //facebook unlink
  app.get('/unlink/facebook', function(req, res){
    var user = req.user;
    user.facebook.token = undefined;
    user.save(function(err){
      res.redirect('/profile');
    });
  });

  //twitter unlink
  app.get('/unlink/twitter', function(req, res){
    var user = req.user;
    user.twitter.token = undefined;
    user.save(function(err){
      res.redirect('/profile');
    });
  });

  //google unlink
  app.get('/unlink/google', function(req, res){
    var user = req.user;
    user.google.token = undefined;
    user.save(function(err){
      res.redirect('/profile');
    });
  });

  //Logout
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  //route middleware to make sure a user is logged in
  function isLoggedIn(req, res, next){
    //if user is authenticated in the session, keep going
    if(req.isAuthenticated()){
      return next();
    }else{
      //if they aren't redirect them to home page
      res.redirect('/');
    }
  }
};

//===============================================
// Functions used by routes
//==============================================

//renders a question from the stanford collection
function renderStanfordQuestion(req, res){
  //first we get a random question from the stanfordQuestions
  var filter = {};
  var fields = {};
  StanfordQuestion.findRandom(filter, fields, {limit: 1}, function(err, result){
    if(err) throw err;

    //get 11 more answers with the same category as the result, where the answer isn't the same
    var filter = {answer: {$ne: result[0].answer}, category: result[0].category};
    var fields = {answer: 1};//only get the answers
    StanfordQuestion.findRandom(filter, fields, {limit: 11}, function(error, answers){
      if(error) throw error;
      
      //if signed in, save score into session
      if(req.user) req.session.score = req.user.gameinfo.score;

      //splice the correct answer into the list of answers
      var answerIndex = Math.floor(Math.random() * 12);
      if(answers == null) return 0;
      answers.splice(answerIndex, 0, {answer: result[0].answer});

      //modify answers array, so answer is stored as "label" instead of answer
      //this is for compatibility with the quizQuestion type
      var modifiedAnswers = new Array();
      for(var i = 0; i < answers.length; i++){
        answers[i]["label"] = answers[i]["answer"];
      }

      var questionType = "stanfordQuestion";
      res.render('index.ejs', {
        title: "Quiz Game",
        category: result[0].category,
        question: result[0].question,
        answer  : result[0].answer,
        answers : answers,
        answerIndex : answerIndex,
        user: req.user,
        session: req.session,
        questionType: questionType,
        questionId: result[0]._id
      });
    });
    
     //res.send(result[0].answer);
    

  });
}

async function renderQuizQuestion(req, res){
   // Get the count of all quizquestions
    //////QuizQuestion.count().exec(function (err, count) {

    var count = await QuizQuestion.countDocuments(); 

    // Get a random entry
    var random = Math.floor(Math.random() * count)

    // Again query all users but only fetch one offset by our random #
    QuizQuestion.findOne().skip(random).exec(
      function (err, result) {
        if(!err){
          var filter = {label: {$ne: result.label}, category: result.category};
          var fields = {label: 1}; //only pull up the answers
        QuizQuestion.findRandom( filter, fields, {limit: 11}, function(error, answers){
            if(error)throw error;
            
            if(req.user)
               req.session.score = req.user.gameinfo.score;
            console.log("id: " + result._id);

            //replace any occurance of the string "???" in db, with "
            result.raw = result.raw.replace(new RegExp("???".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), "\'");
            result.raw = result.raw.replace(new RegExp("??".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), "\'");
        
            var answerIndex = Math.floor(Math.random() * 12);
            answers.splice(answerIndex, 0, {label: result.label});

            var questionType = "quizQuestion";
               res.render('index.ejs',{
                title  : "Quiz Game",
                category : result.category,
                question : result.raw,
                answer   : result.label,
                answers : answers,
                answerIndex : answerIndex,
                user : req.user,
                session : req.session,
                questionType: questionType,
                questionId : result._id
              });
          });
        } 
      })
    /////})

}

//getDiscordQuestion()
async function getDiscordQuestion(req, res){
  
  //first we get a random question from the JQuestions   
  /////////var filter = {}; // this filter queries the entire jQuestion database, chat gpt will be used to transform questions
  var filter = {wrongAnswers: {$exists: true}}; // This filter queries questions in the db, where wrong answers exist, this means that chatgpt will not be used
  var fields = {}; //only pull up the answers

  // Get a random entry
  //var count = await JQuestion.find(filter, fields).countDocuments();
  var count = await JQuestion.countDocuments(filter); 
  var random = Math.floor(Math.random() * count)

  // Attempt new query
  var result = await JQuestion.findOne(filter, fields).skip(random);
  console.log(result);

  // Check if the wrongAnswers field exists in this document, if it doesn't, we're going to
  // generate wrong answers with chatGPT
  wrongAnswers = [];

  if(result.wrongAnswers.length == 0){
    //if(true){ // REMOVE THIS AND REPLACE WITH ABOVE
    // If we have no generated answers, we have also not cleaned the question.
    // use chatgpt to clean the question
    newQuestion = await chatGPT("The answer to this jeopardy question is: "+result.answer+". Rewrite this jeopardy question to be a normal question: '" +result.question+ "'. Do not include the anwer.");
    wrongAnswerString = await chatGPT("The answer to the following question is " + result.answer + ". Come up with 11 wrong answers. The question is: " + result.question + " Seperate Answers with a comma.");
    
    // if the wrong answer string ends witha  ., remove it
    if(wrongAnswerString.charAt(wrongAnswerString.length - 1) == '.'){
      wrongAnswerString = wrongAnswerString.slice(0, -1);
    }

    // make wrong answer string completely capital
    wrongAnswerString = wrongAnswerString.toUpperCase();

    //save the newly generated question:
    result.question = newQuestion;

    result.answer = result.answer.toUpperCase();
    
    wrongAnswers = wrongAnswerString.split(",");

    //wrongAnswers = ["Aristarchus", "Tycho Brahe", "Johannes Kepler", "Isaac Newton", "Albert Einstein", "Edwin Hubble", "Stephen Hawking", "Galen", "Andreas Vesalius", "William Harvey", "Robert Boyle"];
    

    if(wrongAnswers.length != 11){

      // the wrong answer didn't get split by a, comma, maybe a space will work?
      wrongAnswers = wrongAnswerString.split(" ");

      // check if the first item is two new lines, if so, remove it.
      if(wrongAnswers[0] == "\n\n"){
        wrongAnswers.splice(0, 1);
      }

      // maybe splitting by a space worked?
      if(wrongAnswers.length != 11){

        // it still didn't work, maybe splitting my new lines, and removing blanks?
        wrongAnswers = wrongAnswerString.split("\n");
        var temp = [];
        for(item in wrongAnswers){
          if(wrongAnswers[item].length != 0 && wrongAnswers[item] != 0 && wrongAnswers[item] != '0'){
            temp.push(wrongAnswers[item]);
          }
        }

        wrongAnswers = temp;

        if(wrongAnswers.length != 11){
          getDiscordQuestion(res, req);
          return;
        }else{
          result.wrongAnswers = wrongAnswers;
          result.save();
        }

        
      }else{
        result.wrongAnswers = wrongAnswers;
        result.save();
      }
      
    }else{
      result.wrongAnswers = wrongAnswers;
      result.save();
    }

    
  }else{
    console.log("Skipping ChatGPT Generation");
    wrongAnswers = result.wrongAnswers;
  }

  var answers = [];

  // put the object returnd from db into an array
  for(wA in wrongAnswers){
    answers.push({answer: wrongAnswers[wA]});
  }


  //if signed in, save score into session
  if(req.user) req.session.score = req.user.gameinfo.score;

  // Mix the correct answer up with the wrong answers
  var answerIndex = Math.floor(Math.random() * 12);
  if(answers == null)return 0;
  answers.splice(answerIndex, 0, {answer: result.answer});

  //modify answers array, so answer is stored as "label" instead of answer
  //this is for compatibility with the quizQuestion type
  
  for(var i = 0; i < answers.length; i++){
    answers[i]["label"] = answers[i]["answer"];
  }

  var questionType = "jQuestion";


  discordQuestionToReturn = 
      {
        "id": result._id,
        "category": result.category,
        "question": result.question,
        "answer": result.answer,
        "answers": answers,
        "answerIndex": answerIndex,
        "user": req.user,
        "session": req.session
      }
  

  return discordQuestionToReturn;
}

//Renders a question from the jquestion collection
async function renderJQuestion(req, res){

  /*
  var count = await QuizQuestion.countDocuments(); 

    // Get a random entry
    var random = Math.floor(Math.random() * count)
  //first we get a random question from the JQuestions    
    var filter = {subDiscipline: {$exists: true}};
    var fields = {}; //only pull up the answers

  // Attempt new query
  var result = await JQuestion.findOne(filter, fields).skip(random);
  console.log(result);

  // Check if the wrongAnswers field exists in this document, if it doesn't, we're going to
  // generate wrong answers with chatGPT
  wrongAnswers = [];
  if(result.wrongAnswers.length == 0){
    //if(true){ // REMOVE THIS AND REPLACE WITH ABOVE
    // If we have no generated answers, we have also not cleaned the question.
    // use chatgpt to clean the question
    newQuestion = await chatGPT("The answer to this jeopardy question is: "+result.answer+". Rewrite this jeopardy question to be a normal question: '" +result.question+ "'. Do not include the anwer.");
    wrongAnswerString = await chatGPT("The answer to the following question is " + result.answer + ". Come up with 11 wrong answers. The question is: " + result.question + " Seperate Answers with a comma.");
    
    // if the wrong answer string ends witha  ., remove it
    if(wrongAnswerString.charAt(wrongAnswerString.length - 1) == '.'){
      wrongAnswerString = wrongAnswerString.slice(0, -1);
    }

    // make wrong answer string completely capital
    wrongAnswerString = wrongAnswerString.toUpperCase();

    //save the newly generated question:
    result.question = newQuestion;

    result.answer = result.answer.toUpperCase();
    
    wrongAnswers = wrongAnswerString.split(",");

    //wrongAnswers = ["Aristarchus", "Tycho Brahe", "Johannes Kepler", "Isaac Newton", "Albert Einstein", "Edwin Hubble", "Stephen Hawking", "Galen", "Andreas Vesalius", "William Harvey", "Robert Boyle"];
    

    if(wrongAnswers.length != 11){

      // the wrong answer didn't get split by a, comma, maybe a space will work?
      wrongAnswers = wrongAnswerString.split(" ");

      // check if the first item is two new lines, if so, remove it.
      if(wrongAnswers[0] == "\n\n"){
        wrongAnswers.splice(0, 1);
      }

      // maybe splitting by a space worked?
      if(wrongAnswers.length != 11){

        // it still didn't work, maybe splitting my new lines, and removing blanks?
        wrongAnswers = wrongAnswerString.split("\n");
        var temp = [];
        for(item in wrongAnswers){
          if(wrongAnswers[item].length != 0 && wrongAnswers[item] != 0 && wrongAnswers[item] != '0'){
            temp.push(wrongAnswers[item]);
          }
        }

        wrongAnswers = temp;

        if(wrongAnswers.length != 11){
          renderJQuestion(req, res);
          return;
        }else{
          result.wrongAnswers = wrongAnswers;
          result.save();
        }

        
      }else{
        result.wrongAnswers = wrongAnswers;
        result.save();
      }
      
    }else{
      result.wrongAnswers = wrongAnswers;
      result.save();
    }

    
  }else{
    wrongAnswers = result.wrongAnswers;
  }

  var answers = [];

  // put the object returnd from db into an array
  for(wA in wrongAnswers){
    answers.push({answer: wrongAnswers[wA]});
  }


  //if signed in, save score into session
  if(req.user) req.session.score = req.user.gameinfo.score;

  // Mix the correct answer up with the wrong answers
  var answerIndex = Math.floor(Math.random() * 12);
  if(answers == null)return 0;
  answers.splice(answerIndex, 0, {answer: result.answer});

  //modify answers array, so answer is stored as "label" instead of answer
  //this is for compatibility with the quizQuestion type
  
  for(var i = 0; i < answers.length; i++){
    answers[i]["label"] = answers[i]["answer"];
  }
  */


  //first we get a random question from the JQuestions   
  ///////var filter = {}; // this filter queries the entire jQuestion database, chat gpt will be used to transform questions
  var filter = {wrongAnswers: {$exists: true}}; // This filter queries questions in the db, where wrong answers exist, this means that chatgpt will not be used
  var fields = {}; //only pull up the answers

  // Get a random entry
  //var count = await JQuestion.find(filter, fields).countDocuments();
  var count = await JQuestion.countDocuments(filter); 
  var random = Math.floor(Math.random() * count)

  // Attempt new query
  var result = await JQuestion.findOne(filter, fields).skip(random);
  console.log(result);

  // Check if the wrongAnswers field exists in this document, if it doesn't, we're going to
  // generate wrong answers with chatGPT
  wrongAnswers = [];
  
  if(result.wrongAnswers.length == 0){
    //if(true){ // REMOVE THIS AND REPLACE WITH ABOVE
    // If we have no generated answers, we have also not cleaned the question.
    // use chatgpt to clean the question
    newQuestion = await chatGPT("The answer to this jeopardy question is: "+result.answer+". Rewrite this jeopardy question to be a normal question: '" +result.question+ "'. Do not include the anwer.");
    wrongAnswerString = await chatGPT("The answer to the following question is " + result.answer + ". Come up with 11 wrong answers. The question is: " + result.question + " Seperate Answers with a comma.");
    
    // if the wrong answer string ends witha  ., remove it
    if(wrongAnswerString.charAt(wrongAnswerString.length - 1) == '.'){
      wrongAnswerString = wrongAnswerString.slice(0, -1);
    }

    // make wrong answer string completely capital
    wrongAnswerString = wrongAnswerString.toUpperCase();

    //save the newly generated question:
    result.question = newQuestion;

    result.answer = result.answer.toUpperCase();
    
    wrongAnswers = wrongAnswerString.split(",");

    //wrongAnswers = ["Aristarchus", "Tycho Brahe", "Johannes Kepler", "Isaac Newton", "Albert Einstein", "Edwin Hubble", "Stephen Hawking", "Galen", "Andreas Vesalius", "William Harvey", "Robert Boyle"];
    

    if(wrongAnswers.length != 11){

      // the wrong answer didn't get split by a, comma, maybe a space will work?
      wrongAnswers = wrongAnswerString.split(" ");

      // check if the first item is two new lines, if so, remove it.
      if(wrongAnswers[0] == "\n\n"){
        wrongAnswers.splice(0, 1);
      }

      // maybe splitting by a space worked?
      if(wrongAnswers.length != 11){

        // it still didn't work, maybe splitting my new lines, and removing blanks?
        wrongAnswers = wrongAnswerString.split("\n");
        var temp = [];
        for(item in wrongAnswers){
          if(wrongAnswers[item].length != 0 && wrongAnswers[item] != 0 && wrongAnswers[item] != '0'){
            temp.push(wrongAnswers[item]);
          }
        }

        wrongAnswers = temp;

        if(wrongAnswers.length != 11){
          renderJQuestion(res, req);
          return;
        }else{
          result.wrongAnswers = wrongAnswers;
          result.save();
        }

        
      }else{
        result.wrongAnswers = wrongAnswers;
        result.save();
      }
      
    }else{
      result.wrongAnswers = wrongAnswers;
      result.save();
    }

    
  }else{
    console.log("Skipping ChatGPT Generation");
    wrongAnswers = result.wrongAnswers;
  }

  var answers = [];

  // put the object returnd from db into an array
  for(wA in wrongAnswers){
    answers.push({answer: wrongAnswers[wA]});
  }


  //if signed in, save score into session
  if(req.user) req.session.score = req.user.gameinfo.score;

  // Mix the correct answer up with the wrong answers
  var answerIndex = Math.floor(Math.random() * 12);
  if(answers == null)return 0;
  answers.splice(answerIndex, 0, {answer: result.answer});

  //modify answers array, so answer is stored as "label" instead of answer
  //this is for compatibility with the quizQuestion type
  
  for(var i = 0; i < answers.length; i++){
    answers[i]["label"] = answers[i]["answer"];
  }

  var questionType = "jQuestion";


  res.render('index.ejs', {
    title: "Quiz Game",
    category: result.category,
    question: result.question,
    answer  : result.answer,
    answers : answers,
    answerIndex: answerIndex,
    user: req.user,
    session: req.session,
    questionType: questionType,
    questionId : result._id
  });
}


async function chatGPT2(inputString, responseNumToGenerate = 2){
  var returnChoices = [];

  try{
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      //model: "text-davinci-003",
      //max_tokens: 100,
      n: responseNumToGenerate, // the number of reponses
      temperature: .8,
      messages: [{role: "user", content: inputString}]
    });
  
    
    for (c in completion.data.choices){
      var choiceMessage = completion.data.choices[c].message.content;
  
      returnChoices.push(choiceMessage);
    }
  }catch(error){
    return error;//res.json({"error": error.toString()})
  }
  
  return returnChoices;
}


/** Talk to chat gpt */
async function chatGPT(inputString){
  //clean the string of apostrophies
  inputString = inputString.replace(/'/g, '');
  inputString = inputString.replace(/"/g, '');

  // strip out every number that has a . after

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    max_tokens: 100,
    messages: [{role: "user", content: inputString}]
  });

  var returnString = completion.data.choices[0].message.content

//clean the output of number.
  returnString = returnString.replace(/[0-9]+\./g, "");
  returnString = returnString.replace(/[0-9]+\)/g, "");
  returnString = returnString.replace(/\\n/g, '');

  // remove end of sentence periods.
  returnString = returnString.replace(/\.\s/g, " ");
  //returnString = returnString.replace(/./g, '');

  console.log(returnString);
  return returnString;
}

function functionTest(){
  console.log("functionTEST CALLED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}
