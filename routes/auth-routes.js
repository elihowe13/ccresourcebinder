const router = require('express').Router();
const passport = require('passport');

// auth login 
router.get('/login', (req, res) => {
    res.render('login')
});

// demo login with passport local
router.get('/demo-login', (req, res) => {
    res.render('demo-login')
});

router.post('/demo-login/submit', passport.authenticate('local', {
    successRedirect: '/', // Redirect on successful login
}));

// auth logout
router.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
});

router.get('/microsoft', passport.authenticate('microsoft', {
    scope: ''
}));

router.get('/microsoft/redirect', passport.authenticate('microsoft', {
    failureRedirect: '/auth/unregistered',
}), (req, res) => {
    res.redirect('/')
});

router.get('/unregistered', (req, res) => {
    res.render('unregistered');
})

module.exports = router;