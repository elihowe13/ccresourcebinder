const express = require('express');
const app = express();
const functions = require('./functions');
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;

app.set('views', __dirname + '/views'); // Set the 'views' directory as the location for EJS templates
app.set('view engine', 'ejs'); // Set EJS as the template engine
app.use(express.static('static')); // Serve static files from the 'static' directory
app.use(bodyParser.json()); // Middleware for parsing json request bodies


app.post('/change-page', async (req, res) => {

    const state = req.body;
    const criteria = state.criteria;
    const searchTerms = state.searchTerms;
    const pageIndex = state.pageIndex;
    
    const fullArray = functions.getResourceList(criteria, searchTerms); 
    const resourceList = fullArray.slice(1);

    try {
        const responseData = await functions.loadResults(resourceList, pageIndex);
        res.json(responseData);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/submit-search', async (req, res) => {
    try {
        const criteria = req.body.criteria;
        const searchTerms = req.body.searchTerms;
        
        const fullArray = functions.getResourceList(criteria, searchTerms); 
        const filterData = fullArray[0];
        const resourceList = fullArray.slice(1);

        const [formsArray, { resultsHtml, maxPageIndex, start, end, count }] = await Promise.all([
            functions.loadFilters(filterData, criteria, true),
            functions.loadResults(resourceList, 0),
        ]);
        res.json({ formsArray, resultsHtml, maxPageIndex, start, end, count });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/suggest-update', async (req, res) => {
    try {

        const data = req.body;
        data["timeStamp"] = new Date();

        result = await functions.suggestUpdate(data);
        res.json(result);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/suggest-new-resource', async (req, res) => {
    try {

        const data = req.body;
        data["timeStamp"] = new Date();

        result = await functions.suggestNewResource(data);
        res.json(result);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/', async (req, res) => {
    try {

        const criteria = {};
        const fullArray = functions.getResourceList(criteria); // get the full array with no filter applied 
        const filterData = fullArray[0];
        const resourceList = fullArray.slice(1);

        const [filtersHtml , { resultsHtml, start, end, count } ] = await Promise.all([
            functions.loadFilters(filterData, criteria),
            functions.loadResults(resourceList, 0),
        ]);

        res.render('main', { filtersHtml, resultsHtml, start, end, count });

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
