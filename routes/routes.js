// routes/routes.js
module.exports = function(app, passport){
  //Home Page
  app.get('/', function(req, res){
    res.render('index.ejs');
  });
};
