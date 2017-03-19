var express = require('express');
var router = express.Router();
var models = require('../models/models.js');
var Message = models.Message;
var Contact = models.Contact;
var User = models.User;

var client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
var sendgrid = require('sendgrid').mail;
var multer  = require('multer')
var upload = multer()

router.post('/messages/receive', function(req, res) {
  User.findOne({phone: req.body.To.substring(2)}, function(err, user) {
    if (err) {
      res.status(500).send(err)
    } else {
      Contact.findOne({phone: req.body.From.substring(2)}, function(err, contact) {
        if (err) {
          res.status(500).send(err)
        } else {
          var newMessage = new Message ({
            created: new Date(),
            content: req.body.Body,
            user: user._id,
            contact: contact._id,
            status: 'received',
            from: req.body.From,
            channel: 'sms'
          });
          newMessage.save(function(err) {
            if (err) { res.status(500).send(err) }
            console.log("text received!")
          });
        }
      });
    }
  });
});

router.get('/messages/sendScheduled', function(req, res) {
  Message.find({status: 'scheduled'}, function(err, message) {
    if (err) { res.status(500).send(err) }
    var messageSend = message.filter(function(message) {
      return new Date(message.timeToSend) < new Date();
    });
    if (messageSend.length === 0) {
      res.status(500).send("No messages to send right now!")
    }
    messageSend.forEach(function(message) {
      Contact.findById(message.contact, function(err, contact) {
        if (err) {
          res.status(500).send(err)
        } else {
          User.findById(message.user, function(err, user) {
            if (err) {
              res.status(500).send(err)
            } else if (message.channel === "sms") {
              client.sendMessage({
                to: '+1' + contact.phone, 
                from: '+1' + user.phone,
                body: message.content
              }, function(err, responseData) {
                if (err) {
                  res.status(500).send(err)
                } else {
                  Message.findByIdAndUpdate(message._id, {status: 'sent'}, function(err, user) {
                    if (err) {
                      res.status(500).send('Error sending')
                    } else {
                      res.send('Success!');
                    }
                  });
                }
              });
            } else if (message.channel === "email") {
              sendEmailFunction('test@example.com', contact.email, message.content);
              Message.findByIdAndUpdate(message._id, {status: 'sent'}, function(err, user) {
                if (err) {
                  res.status(500).send('Error sending')
                } else {
                  res.send('Success!');
                }
              });
            }
          });
        }
      });
    });
  });
});

/* GET home page. */
router.use(function(req, res, next) {
  if (!req.user) {
    res.redirect('/login')
  } else {
    next();
  }
});

router.get('/contacts', function(req, res, next) {
  Contact.find(function(err, contact) {
    if (err) {
      res.status(500).json({err})
    } else {
      res.render('contacts', {
        contact: contact
      });
    }
  });
});

router.get('/contacts/new', function(req, res, next) {
  res.render('editContact')
});

router.get('/contacts/new/:id', function(req, res, next) {
  Contact.findById(req.params.id, function(err, contact) {
    if (err) {
      res.status(500).json({err})
    } else {
      res.render('editContact', {
        contact: contact
      });
    }
  });
});

router.post('/contacts/new', function(req, res, next) {
  if (req.body.contactName === '' || req.body.contactPhone === '') {
    res.status(400).send("Name and phone number must not be empty")
  } else if (isNaN(req.body.contactPhone) || req.body.contactPhone.length !== 10) {
    res.status(400).send("Phone number must be exactly 10 digits.")
  } else {
    var newContact = new Contact({
      name: req.body.contactName,
      phone: req.body.contactPhone,
      owner: req.user._id,
      email:req.body.contactEmail
    });
    newContact.save(function(err) {
      if (err) {
        res.status(500).json({err})
      } else {
        res.redirect('/contacts');
      }
    })
  }
});

router.post('/contacts/new/:id', function(req, res, next) {
  if (req.body.contactName === '' || req.body.contactPhone === '') {
    res.status(400).send("Name and phone number must not be empty")
  } else if (isNaN(req.body.contactPhone) || req.body.contactPhone.length !== 10) {
    res.status(400).send("Phone number must be exactly 10 digits.")
  } else {
    Contact.findByIdAndUpdate(req.params.id, {
      name: req.body.contactName,
      phone: req.body.contactPhone
    }, function(err, contact) {
      if (err) {
        res.status(500).json({err})
      } else {
        res.redirect('/contacts');
      }
    });
  }
});

router.get('/messages', function(req, res) {
  console.log(req.user)
  Message.find({user: req.user._id}, function(err, message) {
    if (err) {
      res.status(500).json({err})
    } else {
      res.render('messages', {
        message: message
      });
    }
  });
});


router.get('/messages/:contactId', function(req, res) {
  Contact.findById(req.params.contactId, function(err, contact) {
    if (err) {
      res.status(500).json({err})
    } else {
      Message.find({user: req.user._id, contact: req.params.contactId, status:{$ne: "scheduled"} }, function(err, message) {
        if (err) {
          res.status(500).json({err})
        } else {
          console.log(message)
          var newMessage = message.map(function(messageMap) {
            if (messageMap.timeToSend) {
              messageMap.timeCompare = messageMap.timeToSend;
              return messageMap;
            } else {
              messageMap.timeCompare = messageMap.created;
              return messageMap;
            }
          }).sort(function(a,b) {
            return a.timeCompare.getTime() - b.timeCompare.getTime();
          })
          Message.find({user: req.user._id, contact: req.params.contactId, status:"scheduled"}, function(err, messageScheduled) {
            if (err) {
              res.render('messages', {
                contact: contact
              });
            };
            res.render('messages', {
              message: message,
              contact: contact,
              messageScheduled: messageScheduled
            });
          });
        }
      });
    }
  });
});

router.get('/messages/send/:contactId', function(req, res) {
  Contact.findById(req.params.contactId, function(err, contact) {
    if (err) {
      res.status(500).json({err})
    } else {
      res.render('newMessage', {
        contact: contact
      });
    }
  });
});

router.post('/messages/send/:contactId', function(req, res) {
  User.findById(req.user._id, function(err, user) {
    if (err) {
      res.status(500).json({err})
    } else {
      Contact.findById(req.params.contactId, function(err, contact) {
        if (err) {
          res.status(500).json({err})
        } else {
          var newMessage = new Message ({
            created: new Date(),
            content: req.body.newMessageContent,
            user: req.user._id,
            contact: contact._id,
            status: 'sent',
            channel: req.body.newMessageChannel
          })
          console.log(newMessage)
          if (req.body.scheduleMessageTimeInput) {
            newMessage.status = 'scheduled';
            newMessage.timeToSend = new Date(req.body.scheduleMessageTimeInput)
          }
          if (newMessage.status === 'sent' && newMessage.channel === 'sms') {
            client.sendMessage({
              to: '+1' + contact.phone,
              from: '+1' + user.phone,
              body: req.body.newMessageContent
            }, function(err, responseData) {
              if (err) {
                res.status(500).json(err);
              } else {
                newMessage.save(function(err) {
                  if (err) {
                    res.status(500).json(err);
                  } else {
                  res.redirect('/messages/' + req.params.contactId)
                  }
                });
              }
            });
          } else if (newMessage.status === 'sent' && newMessage.channel === 'email') {

            sendEmailFunction('lane@lane.joinhorizons.com', contact.email, req.body.newMessageContent);

            newMessage.save(function(err) {
              if (err) {
                res.status(500).json(err);
              } else {
              res.redirect('/messages/' + req.params.contactId)
              }
            });

          } else {
            newMessage.save(function(err) {
              if (err) {
                res.status(500).json(err);
              } else {
                res.redirect('/messages/' + req.params.contactId);
              }
            });
          }
        }
      });
    }
  });
});

var sendEmailFunction = function(fromEmail, toEmail, emailContent) {
  var helper = require('sendgrid').mail;
  var from_email = new helper.Email(fromEmail);
  var to_email = new helper.Email(toEmail);
  var subject = 'New Message from Double-Message!';
  var content = new helper.Content('text/plain', emailContent);
  var mail = new helper.Mail(from_email, subject, to_email, content);

  var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
  var request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });

  sg.API(request, function(error, response) {
    console.log(response.statusCode);
    console.log(response.body);
    console.log(response.headers);
  });
  console.log('email')
}

module.exports = router;
