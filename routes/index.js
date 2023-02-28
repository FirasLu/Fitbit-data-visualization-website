const express = require('express');
const router = express.Router();
const auth = require('./controllers/passport');
const request = require('request-promise');


//Helping Functions
function timeFormatter(value) {
  var date = new Date(value);
  var hours = date.getHours();
  var minutes = leadZero(date.getMinutes());
  return hours + ':' + minutes;
};

function leadZero(n) { return n>9 ? n : "0" + n; };

function isAuthenticated(req, res, next) {
	console.log("REQ.USER");
  // console.log(req.user.profile.id);
  if (req.user)
    return next();  
  // if req.user does not exist redirect them to the fail page.  Here you can either redirect users back to the login page
  res.redirect('/auth/fitbit/failure');
}
//_________________________________________________________________________________________________________________________________________//

//Login page
router.get('/', function(req, res) {
  res.render('login');
});

//Starting the Authentication with sending the required Scopes 
router.get('/auth/fitbit', auth.authenticate('fitbit', {scope: ['activity', 'heartrate', 'location', 'profile', 'sleep', 'weight']}));
router.get('/auth/fitbit/callback', auth.authenticate('fitbit', {
  successRedirect: '/auth/fitbit/success',
  failureRedirect: '/auth/fitbit/failure'
}));

//Main profile page
router.get('/auth/fitbit/success', isAuthenticated, (req, res) => {
  var response;

  request('https://api.fitbit.com/1/user/-/activities//date/today.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    var caloriesOut =  response['summary']['caloriesOut'];
    var distance =  response['summary']['distances'][0]['distance'];
    var floors =  response['summary']['floors'];
    res.render('dashboard', {caloriesOut, distance, floors, user: req.user.profile._json.user });
}); 
});


//Steps Page
router.get('/auth/fitbit/steps', isAuthenticated, (req, res) => {
  var response;
  request('https://api.fitbit.com/1/user/-/activities/steps/date/today/1d.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    var steps =  response['activities-steps'][0]['value'];
    response = response['activities-steps-intraday']['dataset'];
    var times = response.map(
      function(index) {
        return index.time;
      }
    ); 
    var stepsValues = response.map(
      function(index) {
        return index.value;
      }
    );
    res.render('steps', { steps, times, stepsValues, user: req.user.profile._json.user });
  }).catch(error => {
    console.error('There was an error! NO data for this day!');
    res.render('steps.ejs', {steps: 0, times: 0, stepsValues: 0, user: req.user.profile._json.user });
});
});

//Sleep page
router.get('/auth/fitbit/sleep', isAuthenticated, (req, res) => {
  var response;
  request('https://api.fitbit.com/1/user/-/sleep/date/today.json', { 
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    console.log(response);
    var startTime = timeFormatter(response['sleep'][0]['startTime']);
    var endTime = timeFormatter(response['sleep'][0]['endTime']);
    
    // Sleep Stages
    var wake = response['summary']['stages']['wake'];
    var deep = response['summary']['stages']['deep'];
    var light = response['summary']['stages']['light'];
    var rem = response['summary']['stages']['rem'];
    //Sleep sum
    var minutesAsleep = deep + light + rem;
    
    var hours = Math.floor(minutesAsleep / 60);
    var minutes = minutesAsleep % 60;

    res.render('sleep.ejs', {startTime, endTime, hours, minutes, wake, deep, light, rem, user: req.user.profile._json.user });
  }).catch(error => {
    console.error('There was an error! NO sleep data for this day!');
    res.render('sleep.ejs', {startTime: 0, endTime: 0, hours: 0, minutes: 0, wake: 0, deep: 0, light: 0, rem: 0, user: req.user.profile._json.user });
});
});

//Heart Page
router.get('/auth/fitbit/heart', isAuthenticated, (req, res) => {
  var response;
  request('https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json', { 
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    response = response['activities-heart-intraday']['dataset'];
    var times = response.map(
      function(index) {
        return index.time;
      }
    );
    var hrValues = response.map(
      function(index) {
        return index.value;
      }
    );
    //console.log("index: " + times);
    res.render('heart.ejs', {times, hrValues , user: req.user.profile._json.user });
  }).catch(error => {
    console.error('There was an error! NO data for this day!');
    res.render('heart.ejs', {times: 0, hrValues: 0, user: req.user.profile._json.user });
});
});

//Calories Page
router.get('/auth/fitbit/calories', isAuthenticated, (req, res) => {
  var lastWeek = new Date(Date.now() - 604800000);
  lastWeek = lastWeek.toISOString().split('T')[0]; 
  var response;
  request('https://api.fitbit.com/1/user/-/activities/calories/date/'+lastWeek+'/today.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    response = response['activities-calories'];
    var dateTimes = response.map(
      function(index) {
        
        return index.dateTime;
      }
    );
    var caloriesValue = response.map(
      function(index) {
        return index.value;
      }
    );
    res.render('calories', { dateTimes, caloriesValue, user: req.user.profile._json.user });
  });
});
//_________________________________________________________________________________________________________________________________________//


// Update Functions which are called after pressing update button in the dashboards
router.post('/updateSteps', isAuthenticated, (req, res) => {
  console.log("PAYLOAD");
  console.log(req.body.startDate + " to " + req.body.endDate);
  var response;
  request('https://api.fitbit.com/1/user/-/activities/steps/date/' + req.body.startDate + '/' + req.body.endDate + '.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    response = response['activities-steps'];
    var dateTimes = response.map(
      function(index) {
        return index.dateTime;
      }
    );
    var stepsDayValue = response.map(
      function(index) {
        return index.value;
      }
    );
    console.log("index: " + dateTimes,stepsDayValue);
    res.send({dateTimes, stepsDayValue});
  }).catch(error => {
    console.error('There was an error!! no data for this date rang');
});
});

router.post('/updateHeartRate', isAuthenticated, (req, res) => {
  console.log("PAYLOAD");
  console.log(req.body.updateDate);
  var response;
  request('https://api.fitbit.com/1/user/-/activities/heart/date/' + req.body.updateDate + '/1d.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    response = response['activities-heart-intraday']['dataset'];
    const times = response.map(
      function(index) {
        return index.time;
      }
    );
    const hrValues = response.map(
      function(index) {
        return index.value;
      }
    );
    //console.log("index: " + times);
    res.send({times, hrValues});
  }).catch(error => {
    console.error('There was an error! No data for this date!');
});
});

router.post('/updateSleep', isAuthenticated, (req, res) => {
  console.log("PAYLOAD");
  console.log(req.body.updateDate);
  var response;
  request('https://api.fitbit.com/1/user/-/sleep/date/' + req.body.updateDate + '.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    var startTime = timeFormatter(response['sleep'][0]['startTime']);
    var endTime = timeFormatter(response['sleep'][0]['endTime']);
    
    // Sleep Stages
    var wake = response['summary']['stages']['wake'];
    var deep = response['summary']['stages']['deep'];
    var light = response['summary']['stages']['light'];
    var rem = response['summary']['stages']['rem'];
    //Sleep sum
    var minutesAsleep = deep + light + rem;
    
    var hours = Math.floor(minutesAsleep / 60);
    var minutes = minutesAsleep % 60;
    console.log(startTime, endTime);
    res.send({startTime, endTime, hours, minutes, wake, deep, light, rem});
  }).catch(error => {
    console.error('There was an error! NO sleep data for this day!');
    res.render('sleep.ejs', {startTime: 0, endTime: 0, hours: 0, minutes: 0, wake: 0, deep: 0, light: 0, rem: 0, user: req.user });
});
});


router.post('/updateCalories', isAuthenticated, (req, res) => {
  console.log("PAYLOAD");
  console.log(req.body.startDate + " to " + req.body.endDate);
  var response;
  request('https://api.fitbit.com/1/user/-/activities/calories/date/' + req.body.startDate + '/' + req.body.endDate + '.json', {
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': 'Bearer ' + req.user.accessToken
    }
  }).then(function(data) {
    console.log('FITBIT RESPONSE');
    response = JSON.parse(data);
    response = response['activities-calories'];
    var dateTimes = response.map(
      function(index) {
        return index.dateTime;
      }
    );
    var caloriesValue = response.map(
      function(index) {
        return index.value;
      }
    );
    //console.log("index: " + dateTimes,caloriesValue);
    res.send({dateTimes, caloriesValue});
  }).catch(error => {
    console.error('There was an error!!No data for this time range');
});
});

router.get('/auth/fitbit/failure', (req, res) => {
	res.send('Authentication FAIL');
});

module.exports = router;