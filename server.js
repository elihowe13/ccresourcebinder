// basic express setup 
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static('static'));

// keys are modularized to protect when uploading to github 
const keys = require('./config/keys');

// set views directory and engine 
const ejs = require('ejs');
app.set('views', __dirname + '/views'); 
app.set('view engine', 'ejs'); 

// Middleware for parsing json and form data in request bodies
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

// set up and initialize middleware for session cookies
const cookieSession = require('cookie-session');
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000, // max age of cookie in milliseconds (1 day)
    keys: [keys.session.cookieKey]
}))

// passport setup 
const passportSetup = require('./config/passport-setup');
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

// custom middleware for allowing different page layout for [un]authenticated users
const authAltersEndpoint = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.isAdmin = true;
        return next(); 
    } else {
        req.isAdmin = false;
        return next();
    }   
};

// modularized functions for manipulating data and rendering pages 
const functions = require('./functions');

// basic routes
app.get('/', authAltersEndpoint, async (req, res) => {

    const params = req.query
    const pageIndex = params.pageIndex;
    const user = req.user;
    const isAdmin = req.isAdmin;

    try {
        const { paginatedResults, resultsCount, noResults, filters } = await functions.getResourceList(params);

        // initial page render params = {}
        if (Object.keys(params).length == 0) {
            const [ filtersHtml , resultsHtml ] = await Promise.all([
                ejs.renderFile('views/filters.ejs', { filters }),
                ejs.renderFile('views/results.ejs', { paginatedResults, isAdmin })
            ]); 

            res.render('main', { filtersHtml, resultsHtml, resultsCount, isAdmin, user });
        }

        // if filtering resource list produces 0 results
        else if (noResults) {
            resultsHtml = '<h2 id="results-top-label" class="header-container reveal-element">No Results Found...</h2>';
            responseData = { resultsHtml, noResults };
            res.json(responseData);
        }

        // this represents a page change, render only results (leave filters unchanged)
        else if (pageIndex != undefined) {
            const resultsHtml = await ejs.renderFile('views/results.ejs', { paginatedResults, isAdmin });
            res.json({resultsHtml});
        } 

        // this represents a change to the filters/search terms, but not a full page re-render 
        else {
            const [ filtersHtml, resultsHtml ] = await Promise.all([
                ejs.renderFile('views/filters.ejs', { filters }),
                ejs.renderFile('views/results.ejs', { paginatedResults, isAdmin })
            ]);

            res.json({ filtersHtml, resultsHtml, resultsCount });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/submit-form', async (req, res) => {

    const data = req.body;
    try {
        const response = await functions.formToDatabase(data);
        res.json(response);

    } catch (error) {
        console.error('Error:', error);
        res.json(response);
    }
});

// additional routes for authorization and admin-only endpoints in routes folder
const authRoutes = require('./routes/auth-routes');
const adminRoutes = require('./routes/admin-routes');
app.use('/auth', authRoutes); 
app.use('/admin', adminRoutes); 

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
