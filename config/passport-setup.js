const passport = require('passport');
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const keys = require('./keys')
const User = require('../models/user-model');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);

        if (!user) {
            // If the user is not found, call done with an error
            return done(new Error('User not found'), null);
        }

        done(null, user);

    } catch (err) {
        done(err, null)
    }
});

passport.use(
    new MicrosoftStrategy({
        // options for strategy 
        clientID: keys.microsoft.clientId,
        clientSecret: keys.microsoft.clientSecret,
        callbackURL: 'http://localhost:3000/auth/microsoft/redirect',
        scope: ['user.read']
    }, async (accessToken, refreshToken, profile, done) => {

        try {
            // check if user already exists in database 
            const currentUser = await User.findOne({microsoftId: profile.id});
            if (currentUser) {
                // already have the user
                done(null, currentUser);
            } else {
                return done(null, false);
                // if no user, create new 
                /*
                const newUser = await new User({
                    username: profile.displayName,
                    microsoftId: profile.id,
                    email: profile._json.mail,
                    lastName: profile.name.familyName,
                    firstName: profile.name.givenName
                }).save();
                done(null, newUser);
                */
            }
        } catch (err) {
            //handle potential authentication error
            done(err, null);
        }
    })
);


// Strategy just for demonstration purposes. Will be deleted when live. 
passport.use(
    new LocalStrategy((username, password, done) => {

        usernamePass = username == keys.demo.username;
        passwordPass = password == keys.demo.password;

        user = {
            username,
            password,
            id: keys.demo.id
        }

        if (usernamePass && passwordPass) {
            return done(null, user);
        } else if (!usernamePass || !passwordPass) {
            return done(null, false, { message: 'Incorrect username or password.' });
        }
    })
);
