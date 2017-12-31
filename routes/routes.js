// routes/routes.js

// load up the quizQestions model
var QuizQuestion            = require('../models/quizQuestions');
var Users                   = require('../models/user');
var JQuestion               = require('../models/jQuestions');
var ReportProblem           = require('../models/reportProblem');
var QuestionHistory         = require('../models/questionHistory');
var ObjectId                = require('mongoose').Types.ObjectId;

//convert stanford questions
var s_old_questions = require('../models/stanford_old');
var StanfordQuestion        = require('../models/stanfordQuestions');


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

  //The main page, renders jquestion or quizquestion half time
  app.get('/', function(req, res){
    var random = getRandomIntInclusive(0, 2);


    if(random == 0){
      renderJQuestion(req, res);
    }else if(random == 1){
      renderQuizQuestion(req, res);
    }else{
      renderStanfordQuestion(req, res);
    }

  });

  //user clicked on a wrong answer
  app.get('/wronganswer/:questionType/:questionId', function(req, res, done){
    console.log("questionType: " + req.params.questionType + " - questionId: " + req.params.questionId);
    console.log("uid: " + req.user._id);
    //get the number of times user has answered this question wrong, increment that
    
    var query = { uid: new ObjectId(req.user._id), qid: new ObjectId(req.params.questionId), type: req.params.questionType };
    QuestionHistory.findOne({query}, {}, {}, function(err, result){
      if(err)throw err;
      //question has not been attempted yet by this player, create a new history record
      console.log("result: " + result);
      if(result == "" || result == null){
        console.log("creating question history");
        var history = new QuestionHistory();
        history.uid = new ObjectId(req.user._id);
        history.type = req.params.questionType;
        history.qid = new ObjectId(req.params.questionId);
        history.wrongattempts = 1;
        history.rightattempts = 0;
        history.save();
      
      }else{
        //question has already been attempted, increment correct field
        console.log("updating question history");
        result.wrongattempts = result.wrongattempts + 1;
        result.save();
      }
      //we decrease the score in the session and
      //update that score to the db
      req.session.score = req.session.score - 1;
      req.user.gameinfo.score = req.session.score;
      req.user.save();
      res.send({
        message: "ok",
        score  : req.session.score
      });
    });    

  });

  //user clicked on a right answer
  app.get('/rightanswer/:questionType/:questionId', function(req, res, done){
    console.log("questionType: " + req.params.questionType + " - questionId: " + req.params.questionId);

    var query = { uid: new ObjectId(req.user._id), qid: new ObjectId(req.params.questionId), type: req.params.questionType };
    QuestionHistory.findOne({query}, {}, {}, function(err, result){
      if(err) throw err;
      if(result == "" || result == null){
        //question has not been attempted yet by this player, create a new history record
        var history = new QuestionHistory();
        history.uid = new ObjectId(req.user._id);
        history.type = req.params.questionType;
        history.qid = new ObjectId(req.params.questionId);
        history.wrongattempts = 0;
        history.rightattempts = 1;
        history.save();
        
      }else{
        //question has already been attempted, increment correct field
        result.rightattempts = result.rightattempts+1;
        result.save();
      }
      //we decrease the score in the session and
      //update that score to the db
      req.session.score = req.session.score + 5;
      req.user.gameinfo.score = req.session.score;
      req.user.save();
      res.send({
        message: "ok",
        score  : req.session.score
      });//end res.send
    });//end findOne
  });//end app.get

  app.get('/scoreboard', function(req, res, done){
    Users.find({}, {}, ).sort('-gameinfo.score').exec(function(err, results){
      if(err) throw err;

      res.render('scoreboard.ejs',{
        title: "Quiz Game Scoreboard",
        results: results,
        user: req.user
      });
    });
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

  //=============================================
  // Admin Routes
  //============================================
  
  //admin page
  app.get('/admin', function(req, res){
    //check if user is an admin
    if(req.user && req.user.permissions.admin){
      ReportProblem.find({}, {}, function(err, results){
        console.log(results);

        res.render('admin.ejs', {
          title: "Quiz Game Admin",
          user: req.user,
          reports: results
        });
      });
    }else{
      res.redirect('/login');
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

    //find all questionhistories with this users id
    QuestionHistory.find({uid: new ObjectId(req.user._id)}, {}, {}, function(err, result){
      if(err)throw err;
      res.render(
        'profile.ejs',{ 
          user: req.user,
          questionHistory: result,
          title: "Quiz Game - Profile"
        } //get the user out of session and pass to template
      );

    });
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

function renderQuizQuestion(req, res){
   // Get the count of all quizquestions
    QuizQuestion.count().exec(function (err, count) {

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
    })

}

//Renders a question from the jquestion collection
function renderJQuestion(req, res){
  //first we get a random question from the JQuestions    
    var filter = {subDiscipline: {$exists: true}};
    var fields = {}; //only pull up the answers
    JQuestion.findRandom( filter, fields, {limit: 1}, function(err, result){
      if(err) throw err;
      //get 11 more answers from the same discipline as the result, where the answer isn't the same
      var filter = {answer: {$ne: result[0].answer}, subDiscipline: result[0].subDiscipline};
      //var filter = {discipline: "Science"};
      //var fields = {}; //we only want to query for random answers
      var fields = {answer: 1}; //only pull up the answers
      JQuestion.findRandom(filter, fields, {limit: 11}, function(error, answers){
        if(error) throw error;

        //if signed in, save score into session
        if(req.user) req.session.score = req.user.gameinfo.score;

        //splice the correct answer into the list of answers
        var answerIndex = Math.floor(Math.random() * 12);
        if(answers == null)return 0;
        answers.splice(answerIndex, 0, {answer: result[0].answer});

        //modify answers array, so answer is stored as "label" instead of answer
        //this is for compatibility with the quizQuestion type
        var modifiedAnswers = new Array();
        for(var i = 0; i < answers.length; i++){
          answers[i]["label"] = answers[i]["answer"];
        }
 
        console.log("result[0]._id: " + result[0]._id);
     
        var questionType = "jQuestion";
        res.render('index.ejs', {
          title: "Quiz Game",
          category: result[0].category,
          question: result[0].question,
          answer  : result[0].answer,
          answers : answers,
          answerIndex: answerIndex,
          user: req.user,
          session: req.session,
          questionType: questionType,
          questionId : result[0]._id
        });
      });
    });
}

function functionTest(){
  console.log("functionTEST CALLED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}
