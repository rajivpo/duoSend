"use strict";
var request = require('request');

var port = process.env.PORT || 3000;
var url = 'http://localhost:' + port + '/messages/sendScheduled';

request(url, function(err, response, body) {
  if (err) {
    console.log("Error. Couldn't load '%s' Error: %s", url, err);
    process.exit(1);
  } else {
    if (Math.floor(response.statusCode / 100) === 2) {
      console.log("Success. Loaded: '%s' Response: %s", url, body);
      process.exit(0);
    } else {
      console.log("Error. Loaded: '%s' Status: %s Response: %s",
          url, response.statusCode, body);
      process.exit(1);
    }
  }
});
