var mongoose = require('mongoose');

var connect = require('./connect') || process.env.MONGODB_URI;

mongoose.connect(connect);


var ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: String,
  owner: String,
  email: String
});

var UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  phone: String,
  facebookId: String
});

var MessageSchema = new mongoose.Schema({
  created: Date,
  content: String,
  user: {
    type: String,
    required: true
  },
  contact: String,
  status: String,
  from: String,
  timeToSend: Date,
  channel: String
})

UserSchema.statics.findOrCreate = function findOrCreate(profile, cb){
    var user = new this();
    this.findOne({facebookId : profile.id},function(err, result){
        if(! result) {
            user.username = profile.displayName;
            user.facebookId = profile.id;
            user.save(cb);
        } else {
            cb(err,result);
        }
    });
};

module.exports = {
  Contact: mongoose.model('Contact', ContactSchema),
  User: mongoose.model('User', UserSchema),
  Message: mongoose.model('Message', MessageSchema)
}
