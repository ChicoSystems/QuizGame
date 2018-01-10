Quiz Game
===========
Demo: http://quiz.chicosystems.com

Quiz Game is an online single-player/multi-player trivia game.

Play against your friends trying to answer tens of thousands of different questions. 
Rack up as many points as you can & compare yourself against others.

<p align="center" alt="A Screen Shot">
  <img src="https://i.imgur.com/gZiCxe0.png">
</p>

Quiz Game was created in 2017 & 2018 to enable me to practice trivia questions. I figure that someday I'll try out for Jeopardy. My goal is to win at least one game. So I made this web application to enable myself to get unlimited practice.

## Features

#### Hundreds of thousands of possible questions
Quiz Game has three different collections of questions:
* Jeopardy Questions

   Every Question from every show until 2015. (Over 200,000 questions total)
   
* Quiz Bowl Questions

   Every Question from College Quiz Bowl from 1996-2008 (Over 7,900 questions total)
   
* Stanford NLP Questions

   Questions from the Stanford Natural Language Processing classes. (Over 98,000 questions total)
   
#### Social Login
* Login via your Facebook, Twitter Or Google Accounts. Or you can create a local account!
* Accumulate a score
* Track every question answered
* Keep track of % of questions answered correctly
   
#### Single Player Mode
* Challenge yourself to see how many questions you can get right.

#### Multi Player Mode
* Challenge a friend to a set of questions.
* See when they get their question right, or wrong.
* Chat with your friends.
* Accumulate a score.
* Track's every question answered for future review.
* Keeps track of % of all questions answered correctly

#### Scoreboard
* See how you rate compared to other users

#### Profile Control
* Reset your score
* Reset your question history
* Change the difficulty of questions
* View your question history
* Modify your login info, link or unlink your social accounts

#### Admin Section
* Modify Users Permissions
* Edit the question collections
* View user reports on malformed questions

## Contributing
Quiz Game is a npm/node.js application that uses the [express.js](https://expressjs.com/) framework.
* First you need to install the application
* Make useful changes
* Open a pull request on this repository at [github](https://github.com/ChicoSystems/QuizGame)

#### Installation
* Clone this repository
* Run npm install
* If you want to have social login, rename config/auth-sample.js to config/auth.js & fill in proper fields with your social account information. You'll need to create an app for each social account as documented in [this](https://scotch.io/tutorials/easy-node-authentication-setup-and-local) tutorial
* Download the [database](http://chicosystems.com/quizgamedb) and install it with mongorestore
* Make sure config/database.js points to the url of your database
* run npm start to start the application



==================================================================
`````` -LINECOUNT-
      44 text files.
classified 44 files      44 unique files.                              
    4204 files ignored.

http://cloc.sourceforge.net v 1.60  T=0.11 s (337.8 files/s, 44193.0 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
Javascript                      19            497            622           2102
EJS                             17            194              9           1330
CSS                              1             37              4            170
Bourne Shell                     1              1              0              5
-------------------------------------------------------------------------------
SUM:                            38            729            635           3607
-------------------------------------------------------------------------------
```
