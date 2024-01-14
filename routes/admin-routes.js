const express = require('express');
const router = express.Router();
const passport = require('passport');
const functions = require('../functions');

// Middleware for parsing json and form data in request bodies
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json()); 

// custom middleware for requiring authorization for certain endpoints
const authRequired = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next(); 
    }
    res.redirect('/auth/login'); 
};

router.get('/dashboard', authRequired, async (req, res) => {

    const user = req.user;

    try {
        const {suggestions, updates, filters} = await functions.getDashboardData();

        res.render('dashboard', { user, updates, suggestions, filters });
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/edit-filter', authRequired, async (req, res) => {
    
    const id = req.query.id;

    try {
        responseData = await functions.enableEditFilter(id);
        res.json(responseData);
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.put('/submit-filter-edit', authRequired, async (req, res) => {


    const { filterId, displayFilter } = req.body;

    try {

        const resultHtml = await functions.submitFilterEdit(filterId, displayFilter);
   
        if (resultHtml) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }

    } catch (err) {
        console.error('Error:', err); 
    }
})

router.get('/edit-resource', authRequired, async (req, res) => {
    
    const id = req.query.id;

    try {
        responseData = await functions.enableEditResource(id);
        res.json(responseData);
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.put('/submit-resource-edit', authRequired, async (req, res) => {

    const { updatedResourceInfo } = req.body;

    try {

        const resultHtml = await functions.submitResourceEdit(updatedResourceInfo);
   
        if (resultHtml) {
            res.json({ success: true, resultHtml });
        } else {
            res.json({ success: false });
        }

    } catch (err) {
        console.error('Error:', err); 
    }
});

router.get('/enable-new-resource', authRequired, async (req, res) => {

    try {
        const {resultHtml, autoCompleteOptions} = await functions.enableNewResource();

        res.json({resultHtml, autoCompleteOptions});

    } catch (err) {
        console.error('Error: ', err);
    }
});

router.post('/submit-new-resource', authRequired, async (req, res) => {

    const newResourceInfo = req.body.updatedResourceInfo;

    try {
        const newResource = await functions.submitNewResource(newResourceInfo);

        if (newResource) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }

    } catch (err) {
        console.error('Error: ', err);
    }
});

router.delete('/delete-resource', authRequired, async (req, res) => {

    const resourceId = req.body.resourceId;

    try {
        const deletedResource = await functions.deleteResource(resourceId);

        if (deletedResource) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        };

    } catch (err) {
        console.error(err);
    }
});

router.delete('/delete-document', authRequired, async (req, res) => {

    const { documentType, documentId, deleteAll } = req.body;

    try {
        const deletedDocument = await functions.deleteDocument(documentType, documentId, deleteAll);

        if (deletedDocument) {
            res.json({ success: true, deleteAll });
        } else {
            res.json({ success: false });
        };

    } catch (err) {
        console.error('Error: ', err);
    }
});

module.exports = router;