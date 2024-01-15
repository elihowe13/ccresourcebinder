const ejs = require('ejs');

// MongoDB database setup and connect
const mongoose = require('mongoose');
mongoose.connect(process.env.dbURI);

// MongoDB schemata 
const { Resource, Filter } = require('./models/resource-filter-model');
const { Update, Suggestion } = require('./models/update-suggestion-model');
const User  = require('./models/user-model');

// filter the full dataset using the url query parameters
// returns the number of results designated in query parameters, updated filter options, and total results count 
async function getResourceList(params = {}) {

  const filters = await Filter.find({ display: true }).sort('rank');
  
  const pageIndex = params.pageIndex ? parseInt(params.pageIndex) : 0;
  const pageLength = params.pageLength ? parseInt(params.pageLength) : 25; // default display 25 results per page
  const searchTerms = params.searchTerms;
  delete params.pageIndex;
  delete params.searchTerms; 

  // every value needs to be a an array for filtering and rendering functions to work properly
  Object.keys(params).forEach(key => {
      if (!Array.isArray(params[key])) {
          params[key] = [ params[key] ];
      }
  });

  let searchQuery = [];
  if (searchTerms) {
      searchQuery = [
          {
              '$search': {
                'index': 'default', 
                'text': {
                  'query': searchTerms, 
                  'path': {
                    'wildcard': '*'
                  }
                }
              }
            }
      ]
  };

  // loop through all the filters and make an aggregation pipeline that narrows down the available filter options
  let facets = {}
  let filteringStages = [];
  for (let i = 0; i < filters.length; i++) {

      const filterCategory = filters[i].filter_category;
      const displayFilter = filters[i].display;
      const filterValues = params[filterCategory];

      // this is the common pipeline all filters will get
      const uniqueFilterValues = [
        {
          '$unwind': {
            'path': '$filters'
          }
        }, 
        {
          '$match': {
            'filters.filter_category': filterCategory
          }
        }, 
        {
          '$unwind': {
            'path': '$filters.values'
          }
        }, 
        {
          '$group': {
            '_id': '$filters.filter_category', 
            'values': {
              '$addToSet': '$filters.values'
            }
          }
        }
      ];

      // only add these filters to a pipeline if they are actually displayed to the user
      const pipeline = filteringStages.concat(uniqueFilterValues);
      facets[i] = pipeline;

      const thisStage = {
          '$match': {
            'filters': {
              '$elemMatch': {
                'filter_category': filterCategory, 
                'values': {
                  '$in': filterValues
                }
              }
            }
          }
      };

      // only add this filtering stage if the user selects any of the checkboxes (present in params)
      if (filterValues) {
        filteringStages.push(thisStage); 
      };
    };

    // two additional pipelines will contain results paginated and results count
    const results = filteringStages.concat([
        { $skip: pageIndex * pageLength },
        { $limit: pageLength }
    ]);

    facets['results'] = results;
    facets['results_count'] = filteringStages.concat({ $count: "results_count" });

    // wait for a response from the database
    const dbResponse = await Resource.aggregate(searchQuery).facet(facets);

    // extract results to be displayed from database response
    const paginatedResults = dbResponse[0].results;

    // if no results, exit this function early 
    if (paginatedResults.length === 0) {
      return { noResults: true }
    }

    const resultsCount = dbResponse[0]['results_count'][0].results_count;

    // spread the filters within each resource object so we can use them more easily in the rendering functions
    for (resource of paginatedResults) {
      for (filter of resource.filters) {
        resource[filter.filter_category] = filter.values;
      }
      delete resource.filters;
    }

    // loop through filters again and update the options
    // from params, make an array representing selected filter options
    for (let j = 0; j < filters.length; j++) {

      const key = j.toString();
      const thisPipeline = dbResponse[0][key];
      const filterCategory = filters[j].filter_category;
      let selected = []; 

      if (thisPipeline.length > 0) {
        // filtering this way rather than simply setting values equal to pipeline output 
        // allows us to preserve the order of filter options in the original array 
        filters[j].values = filters[j].values.filter((value, index) => {

          // test whether value is present in params, and add 'true' to array if it is
          if (Array.isArray(params[filterCategory]) && params[filterCategory].includes(value)) {
            selected[index] = true;
          } else {
            selected[index] = false; 
          }

          // passing condition if option is present in list returned by database
          return thisPipeline[0].values.includes(value);
        });
      };
      filters[j]['selected'] = selected;
    };
    
    return { paginatedResults, resultsCount, filters };
};

// this sends new resource suggestions, updates/corrections to database
async function formToDatabase(data) {

  const timestamp = new Date();
  try {
    let response;
    if (data.formName === 'updateExisting') {

      response = await new Update({
        timestamp: timestamp,
        resource_id: data.updateId,
        resource_title: data.updateTitle,
        update_text: data.updateText,
      }).save();

    } else if (data.formName === 'suggestNew') {

      response = await new Suggestion({
        timestamp: timestamp,
        county: data.county,
        title: data.title,
        description: data.description,
        contacts: data.contacts
      }).save();
    };

    if (response){
      return { success: true };
    } else {
      return { success: false };
    };

  } catch (err) {
    console.error('Error:', err);
  };
};

// grabs the json object for the resource being edited, renders it editable returns html and autocomplete options.
async function enableEditResource(resourceId) {

  // pull js object for info of resource to be edited
  let filters;
  let resourceInfo;
  try {
    resourceInfo = await Resource.findOne({ _id: resourceId });
    filters = await Filter.find();
  } catch (err) {
    console.error('Error', err);
    return { error: `There was an error retrieving resource information from the database: ${err}`};
  }

  resourceInfo.filters.forEach(filter => {
    const key = filter.filter_category;
    const values = filter.values;
    resourceInfo[key] = values;
  })
  delete resourceInfo.filters;

  // autofill for making new resource tags. Comes from all filter options. Flatten the array of objects so all keys in one object
  const autoCompleteOptions = filters.reduce((accumulator, currentObject) => {
    accumulator[currentObject.filter_category] = currentObject.values;
    return accumulator;
  }, {});

  const html = await ejs.renderFile('views/edit-resource.ejs', { resourceInfo, filters })

  return { html, autoCompleteOptions, resourceInfo }; 
};

async function enableEditFilter(filterId) {

  // pull js object for info of filter to be edited
  let filterInfo;
  try {

    filterInfo = await Filter.findOne({ _id: filterId });
    const editFilterHtml = await ejs.renderFile('views/edit-filter.ejs', { filterInfo });
    const displayFilter = filterInfo.display;

    return { editFilterHtml, displayFilter };
    
  } catch (err) {
    console.error('Error', err);
    return { error: `There was an error retrieving resource information from the database: ${err}`};
  }
}

// updates the db entry for edited resource 
async function submitResourceEdit(updatedInfo) {

  const resourceId = updatedInfo.id;
  delete updatedInfo.id; 

  try {
      const identifier = { _id: resourceId };
      let updatedResource = await Resource.findOneAndUpdate(identifier, updatedInfo, { new: true });

      console.log(resourceId);
      // flatten filters array 
      for (filter of updatedResource.filters) {
        updatedResource[filter.filter_category] = filter.values;
      }
      delete updatedResource.filters;

      const resultHtml = await ejs.renderFile('views/results.ejs', { 
          paginatedResults: [updatedResource], 
          isAdmin: true
      });

      return resultHtml;

  } catch (err) {
      console.error('Error:', err); 
  }
};

async function submitFilterEdit(filterId, displayFilter) {

  try {
      const identifier = { _id: filterId };
      let updatedFilter = await Filter.findOneAndUpdate(identifier, { display: displayFilter }, { new: true });

      return updatedFilter;

  } catch (err) {
      console.error('Error:', err); 
  }
}
 
// renders the new resource modal html and gets autocomplete options
async function enableNewResource() {

  try {
    const filters = await Filter.find();

    // autofill for making new resource tags. Comes from all filter options. Flatten the array of objects so all keys in one object
    const autoCompleteOptions = filters.reduce((accumulator, currentObject) => {
      accumulator[currentObject.filter_category] = currentObject.values;
      return accumulator;
    }, {});

    const resultHtml = await ejs.renderFile('views/add-resource.ejs', { filters });

    return {resultHtml, autoCompleteOptions};

  } catch (err) {
    console.error("Error:", err);
  }
};

async function submitNewResource(resourceInfo) {

  try {
    
    const newResource = await new Resource(resourceInfo).save();

    return newResource;

  } catch (err) {
    console.error('Error:', err);
  }
};

async function deleteResource( resourceId ) {

  const deletedResource = await Resource.findByIdAndDelete({ _id: resourceId });
  return deletedResource;
}

async function deleteDocument(documentType, documentId, deleteAll) {

  if (documentType === 'Update') {
    Document = Update;
  } else if (documentType === 'Suggestion') {
    Document = Suggestion;
  }

  try {
    let deletedDocument;
    if (deleteAll) {
      deletedDocument = await Document.deleteMany();
    } else {
      deletedDocument = await Document.findByIdAndDelete({ _id: documentId });
    }

    return deletedDocument;

  } catch (err) {
    console.error('Error: ', err);
  }
}

async function getDashboardData() {

  try {
    const [suggestions, updates, filters] = await Promise.all([ 
      Suggestion.find().sort({timestamp: -1}),
      Update.find().sort({timestamp: -1}),
      Filter.find(),
    ])

    return {suggestions, updates, filters};

  } catch (err) {
    console.error('Error: ', err);
  }

}

module.exports = {
    getResourceList,
    formToDatabase,
    enableEditResource,
    enableEditFilter,
    submitResourceEdit,
    submitFilterEdit,
    enableNewResource,
    submitNewResource,
    deleteResource,
    deleteDocument,
    getDashboardData
};