// routes/routes.js
module.exports = function(app, passport){
  //Home Page
  app.get('/', function(req, res){
    res.render('index.ejs');
  });

  //Login Page
  app.get('/login', function(req, res){
    //render the page, and pass in flash data, if it exists
    res.render('login.ejs', 
               {message: req.flash('loginMessage')}
    );
  });

  //process the login form
  app.post('/login', passport.authenticate('local-login',{
    successRedirect : '/profile',
    failureRedirect : '/login',
    failureFlash     : true
  }));

  //Signup Page
  app.get('/signup', function(req, res){
    res.render(
      'signup.ejs',
      { message: req.flash('signupMessage')}
    );
  });

  //process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', //redirect to secure profile section
    failureRedirect : '/signup',  //redirect to signup page with error
    failureFlash    : true        //allow flash messages
  }));

  //Profile Section
  // We want user logged in to visit
  // use route middleware to verify this (isLoggedIn function)
  app.get('/profile', isLoggedIn, function(req, res){
    res.render(
      'profile.ejs',
      { user: req.user} //get the user out of session and pass to template
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
      successRedirect : '/profile',
      failureRedirect : '/'
  }));

  //==============
  //Twitter Routes
  //==============
  
  //route for twitter auth and login
  app.get('/auth/twitter', passport.authenticate('twitter'));

  //handle the callback after twitter has auth'd the user
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
      successRedirect : '/profile',
      failureRedirect : '/'    
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
      successRedirect : '/profile',
      failureRedirect : '/'
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
