const express = require('express');
const fs = require('fs');
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
    const criteria = state[0];
    const searchTerms = state[1];
    let pageIndex = state[4];
    
    const fullArray = functions.getResourceList(criteria, searchTerms); 
    const resourceList = fullArray.slice(1);

    try {
        const responseData = await functions.loadRightPanel(resourceList, pageIndex);
        res.json(responseData);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/submit-filters', async (req, res) => {
    try {
        const state = req.body;
        const criteria = state[0];
        const searchTerms = state[1];
        
        const fullArray = functions.getResourceList(criteria, searchTerms); 
        const filterData = fullArray[0];
        const resourceList = fullArray.slice(1);

        const [leftPanel, { "html": rightPanel }] = await Promise.all([
            functions.loadLeftPanel(filterData, state),
            functions.loadRightPanel(resourceList, 0),
        ]);
        res.json({leftPanel, rightPanel});
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

        const fullArray = functions.getResourceList({}); // get the full array with no filter applied 
        const state = [{},"",[],[true],0]; // Initial page state empty criteria, empty search, filter 0 expanded
        const filterData = fullArray[0];
        const resourceList = fullArray.slice(1);

        const [leftPanel, { "html": rightPanel }] = await Promise.all([
            functions.loadLeftPanel(filterData, state),
            functions.loadRightPanel(resourceList, 0),
        ]);

        res.render('main', { leftPanel, rightPanel, state });

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
