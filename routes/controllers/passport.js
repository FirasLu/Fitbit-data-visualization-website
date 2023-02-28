const passport = require('passport');
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  // placeholder for custom user deserialization.
  // null is for errors
  done(null, user);
});

passport.use( new FitbitStrategy({
    clientID: process.env.FITBIT_CLIENT_ID,
    clientSecret: process.env.FITBIT_CLIENT_SECRET,
    callbackURL: process.env.FITBIT_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    done(null, {
      accessToken: accessToken,
      refreshToken: refreshToken,
      profile: profile
    });
  }
));

module.exports = passport;