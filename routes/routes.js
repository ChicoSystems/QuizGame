// routes/routes.js

// load up the quizQestions model
var QuizQuestion            = require('../models/quizQuestions');
var Users                   = require('../models/user');


module.exports = function(app, passport){
  //Home Page
/*  app.get('/', function(req, res){
    res.render('index.ejs');
  });
*/
  //==============================================
  //Game Routes
  //==============================================
  app.get('/designtest', function(req, res){
    res.render('designTest.ejs', {title : "Quiz Game"});
  });

  app.get('/designtest2', function(req, res){
    res.render('designTest2.ejs', {title : "Quiz Game"});
  });

  app.get('/', function(req, res){
    console.log(req.user);
    // Get the count of all quizquestions
    QuizQuestion.count().exec(function (err, count) {

    // Get a random entry
    var random = Math.floor(Math.random() * count)

    // Again query all users but only fetch one offset by our random #
    QuizQuestion.findOne().skip(random).exec(
      function (err, result) {
        if(!err){
          var filter = {label: {$ne: result.label}, category: result.category};
          //var filter = {label: {$ne: result.label}};
          //var filter = {category : result.category};
          var fields = {label: 1}; //only pull up the answers
        QuizQuestion.findRandom( filter, fields, {limit: 11}, function(error, answers){
        // QuizQuestion.findRandom( filter, fields, {limit: 11}).distinct('label').exec(function(error, answers){
            if(error)throw error;
            
            if(req.user)
               req.session.score = req.user.gameinfo.score;
            console.log("Answer: " + result.label); 
        
            var answerIndex = Math.floor(Math.random() * 12);
            answers.splice(answerIndex, 0, {label: result.label});
               res.render('index.ejs',{
                title  : "Quiz Game",
                category : result.category,
                question : result.raw,
                answer   : result.label,
                answers : answers,
                answerIndex : answerIndex,
                user : req.user,
                session : req.session
              });
          
          });
          

        } 
      })
    })
  });

  //user clicked on a wrong answer
  app.get('/wronganswer', function(req, res, done){
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

  //user clicked on a right answer
  app.get('/rightanswer', function(req, res, done){
    //we decrease the score in the session and
    //update that score to the db
    req.session.score = req.session.score + 5;
    req.user.gameinfo.score = req.session.score;
    req.user.save();
    res.send({
      message: "ok",
      score  : req.session.score
    });
  });

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
