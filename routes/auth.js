var express = require('express');
var router = express.Router();
var models = require('../models/models');
var User = models.User;

module.exports = function(passport) {
  router.get('/', function(req, res) {
    if (req.user) {
      res.redirect('/login')
    } else {
      res.render('contacts')
    }
  });

  router.get('/auth/facebook',
  passport.authenticate('facebook'));

  router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

  router.get('/signup', function(req, res) {
    res.render('signup');
  });

  router.post('/signup', function(req, res) {
    if (req.body.signupUsername === '' || req.body.signupPassword === '' || req.body.signupPasswordConfirm === '') {
      res.status(400).send("Username and password must not be empty")
    } else if (req.body.signupPassword !== req.body.signupPasswordConfirm) {
      res.status(400).send("Passwords do not match!")
    } else{
      newUser = new User ({
        username: req.body.signupUsername,
        password: req.body.signupPassword,
        phone: req.body.signupPhone
      });
      newUser.save(function(err) {
        if (err) {res.status(500).json({err})};
        res.redirect('/login');
      })
    }
  });

  router.get('/login', function(req, res) {
    res.render('login')
  });

  router.post('/login', passport.authenticate('local', {
    successRedirect: '/contacts',
    failureRedirect: '/login'
  }));

  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  return router;
}
