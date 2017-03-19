var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook');
var routes = require('./routes/index');
var auth = require('./routes/auth');
var models = require('./models/models');
var Contact = models.Contact;
var User = models.User;

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Passport

var session = require('express-session');
app.use(session({ secret: 'treasure' }));

passport.use(new LocalStrategy(function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) {
        console.log(err);
        return done(err);
      }
      if (!user) {
        console.log(user);
        return done(null, false);
      }
      if (user.password !== password) {
        return done(null, false);
      }
      return done(null, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    if (err) { return done(err)}
    done(null, user)
  });
});

app.use(passport.initialize());
app.use(passport.session());

app.use('/', auth(passport));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
