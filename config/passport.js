// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
var User            = require('../models/user');

//load the auth variables
var configAuth = require('./auth');

// expose this function to our app using module.exports
module.exports = function(passport) {

  // passport session setup ==================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, email, password, done) {
    // asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      User.findOne({ 'local.email' :  email }, function(err, user) {
        // if there are any errors, return the error
        if (err)
          return done(err);

        // check to see if theres already a user with that email
        if (user) {
          return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
        } else {
          // if there is no user with that email
          // create the user
          var newUser = new User();

          // set the user's local credentials
          newUser.local.email = email;
          newUser.local.password = newUser.generateHash(password);

          // save the user
          newUser.save(function(err) {
            if (err)
              throw err;
            return done(null, newUser);
          });
        }
      });    
    });
  }));

  //==========================
  //Facebook
  //==========================
  passport.use(new FacebookStrategy({
    //pull in our app id and secret from auth.js file
    clientID : configAuth.facebookAuth.clientID,
    clientSecret : configAuth.facebookAuth.clientSecret,
    callbackURL : configAuth.facebookAuth.callbackURL,
    profileFields : ['id', 'email', 'name', 'photos'],
    passReqToCallback : true //allows us to pass in the req from our route to check if logged in
  },
  
  //facebook will send back the token and profile
  function(req, token, refreshToken, profile, done){
    //async
    process.nextTick(function(){
      console.log("facebook process.nextTick");
      //check if the user is already logged in
      if(!req.user){
        console.log("facebook !req.user");
        //find the user in the db based on their facebook id
        User.findOne({'facebook.id' : profile.id }, function(err, user){
          //if there is an error, stop everything an return it
          //ie an error connecting to the db
          if(err)
            return done(err);

          //if the user is found, then log them in
          if(user){
            console.log("facebook (user)");
    
            //If there is a user id already but no token, the user was linked, then unlinked
            //ad our token and profile information
            if(!user.facebook.token){
              console.log("facebook !user.facebook.token");
              user.facebook.token = token;
              user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
              if(profile.emails != null)
                user.facebook.email = profile.emails[0].value;
              if(profile.photos != null)
                user.facebook.photo = profile.photos[0].value;

              //save user back to db
              user.save(function(err){
                if(err)
                  throw err;
                return done(null, user);
              });
              console.log("user found return user");
            }
            return done(null, user); //user found, return user
          }else{
            //if there is no user found with that facebook id, create one
            var newUser = new User();
            
            //set all the facebook info in our user model
            newUser.facebook.id = profile.id; //set users facebook id
            newUser.facebook.token = token; //token provided by facebook
            newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
            if(profile.emails !=null)
              newUser.facebook.email = profile.emails[0].value || null; //Use first email returned
  
            if(profile.photos != null)
              newUser.facebook.photo = profile.photos[0].value;
      
            //save user to the db
            newUser.save(function(err){
              if(err)
                throw err;

              //if successful, return the new user
              return done(null, newUser);
            });
          }
        });
      }else{
        //user already exists and is logged in, we have to link accounts
        var user = req.user; //get user from session
        
        //update the current users facebook creds
        user.facebook.id = profile.id
        user.facebook.token = token
        user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
        if(profile.emails != null)
          user.facebook.email = profile.emails[0].value;
        if(profile.photos != null)
          user.facebook.photo = profile.photos[0].value;

        //save the user
        user.save(function(err){
          if(err)
            throw err;
          return done(null, user);
        });
      }
    });
  }));

  //==============================
  //Twitter
  //==============================
  passport.use(new TwitterStrategy({
    consumerKey : configAuth.twitterAuth.consumerKey,
    consumerSecret : configAuth.twitterAuth.consumerSecret,
    callbackURL : configAuth.twitterAuth.callbackURL,
    passReqToCallback : true //allows us to pass in the req from our route to check if logged in
  },
  function(req, token, tokenSecret, profile, done){
    //make the code async, User.findOne won't fire until we have data back from twitter
    process.nextTick(function(){
      //check if the user is already logged in
      if(!req.user){
        User.findOne({'twitter.id' : profile.id}, function(err, user){
          //if there is an error connecting to db, stop and return error
          if(err) 
            return done(err);

          //if user is found, log them in
          if(user){
            //if there is a user id already but no token, then user has been linked and unlinked
            //add our token and profile info
            if(!user.twitter.token){
              user.twitter.token = token;
              user.twitter.username = profile.username;
              user.twitter.displayName = profile.displayName;
              if(profile.photos != null)
                user.twitter.photo = profile.photos[0].value;

              user.save(function(err){
                if(err)
                  throw err;
                return done(null, user);
              });
            }

            return done(null, user); //user found
          }else{
            //if there is no user, create one
            var newUser = new User();
            
            //set all the user data
            newUser.twitter.id = profile.id;
            newUser.twitter.token = token;
            newUser.twitter.username = profile.username;
            newUser.twitter.displayName = profile.displayName;
            if(profile.photos != null)
              newUser.twitter.photo = profile.photos[0].value;
  
            //save user into db
            newUser.save(function(err){
              if(err)
                throw err;
              return done(null, newUser);
            });
          }
        });
      }else{
        //user already exists and is logged in, we have to link accounts
        var user = req.user; //get user from session
        
        //update the current users twitter creds
        user.twitter.id = profile.id
        user.twitter.token = token
        user.twitter.username = profile.username;
        if(profile.photos != null)
          user.twitter.photo = profile.photos[0].value;

        //save the user
        user.save(function(err){
          if(err)
            throw err;
          return done(null, user);
        });

      }
    });
  }));

  //=======================
  //Google Login
  //=======================
  passport.use(new GoogleStrategy({
    clientID : configAuth.googleAuth.clientID,
    clientSecret : configAuth.googleAuth.clientSecret,
    callbackURL : configAuth.googleAuth.callbackURL,
    passReqToCallback : true //allows us to pass in the req from our route to check if logged in
  },
  function(req, token, refreshToken, profile, done){
    process.nextTick(function(){
      //check if the user is already logged in
      if(!req.user){
        //make async User.findOne won't fire until we have data from google
        User.findOne({'google.id' : profile.id}, function(err, user){
          if(err)
            return done(err);

          if(user){
            //if there is a uer id already but no token, user was linked & unlinked
            //add our token and profile info
            if(!user.google.token){
              user.google.token = token;
              user.google.name = profile.displayName;
              if(profile.emails != null)
                user.google.email = profile.emails[0].value;
              if(profile.photos != null)
                user.google.photo = profile.photos[0].value;

              //save user info
              user.save(function(err){
                if(err)
                  throw err;
                return done(null, user);
              });
            }      
  
            //a user is found, log them in
            return done(null, user);
          }else{
            //a user isn't found in db, create one
            var newUser = new User();
  
            //set all the info
            newUser.google.id = profile.id;
            newUser.google.token = token;
            newUser.google.name = profile.displayName;
            if(profile.emails != null)
              newUser.google.email = profile.emails[0].value;

            if(profile.photos != null)
              newUser.google.photo = profile.photos[0].value;
        
            //save the new user
            newUser.save(function(err){
              if(err)
                throw err;
              return done(null, newUser);
            });
          }
        });
      }else{

        //user already exists and is logged in, we have to link accounts
        var user = req.user; //get user from session
        
        //update the current users google creds
        user.google.id = profile.id
        user.google.token = token
        user.google.name = profile.displayName;
        if(profile.photos != null)
          user.google.photo = profile.photos[0].value;
        if(profile.emails != null)
          user.google.email = profile.emails[0].value;

        //save the user
        user.save(function(err){
          if(err)
            throw err;
          return done(null, user);
        });
      }
    });
  }));


  //===============================
  //Local Login
  //==============================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use('local-login', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, email, password, done) { // callback with email and password from our form
    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    User.findOne({ 'local.email' :  email }, function(err, user) {
      // if there are any errors, return the error before anything else
      if (err)
        return done(err);

      // if no user is found, return the message
        if (!user)
          return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

        // if the user is found but the password is wrong
          if (!user.validPassword(password))
            return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

          // all is well, return successful user
          return done(null, user);
    });

  }));


};


