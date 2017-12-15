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

  //Signup Page
  app.get('/signup', function(req, res){
    res.render(
      'signup.ejs',
      { message: req.flash('signupMessage')}
    );
  });

  //Profile Section
  // We want user logged in to visit
  // use route middleware to verify this (isLoggedIn function)
  app.get('/profile', isLoggedIn, function(req, res){
    res.render(
      'profile.ejs',
      { user: req.user} //get the user out of session and pass to template
    );
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
