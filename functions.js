const fs = require('fs');
const ejs = require('ejs');
const cheerio = require('cheerio');

/*
// Turn the complete spreadsheet data into an array that can be used for filtering/rendering search results
function makeResourceList() {

    // Get spreadsheet data
    const ss = SpreadsheetApp.openById('1UuxM_Xt1PaP5FSjH9lYiL_FGd9mVLxX1o6HAiEdyRQw'); // Spreadsheet ID
    const sheet = ss.getSheetByName('Resource List'); // Sheet name
    const data = sheet.getDataRange().getValues();
  
    // set the filter panel categories and options
    const selections = data[0];
    const headers = data[1];
    let filterCategories = []; 
  
    for (let i = 0; i < selections.length; i++) {
  
      let options = []; // the array containing all the possible options for each filter category
  
      // trim the whitespace in around each option 
      for (const option of data[2][i].split(";")) {
        options.push(option.trim());
      }
  
      if (selections[i]) {
        let category = headers[i];
        let filterObject = {};
        filterObject[category] = options;
        filterCategories.push(filterObject);
      }
    }
  
    // create the list of resources
    let resourceArray = [filterCategories];
  
    for (let i = 3; i < data.length; i++) {
      let listEntry = data[i];
      let listItem = {};
  
      for (let j = 0; j < 7; j++) {
        let key = headers[j].trim();
        let array = listEntry[j].split(";");
        listItem[key] = array;
      }
  
      for (let k = 7; k < listEntry.length; k++) {
        let key = headers[k].trim();
        let text = listEntry[k].trim();
        listItem[key] = text;
      }
  
      resourceArray.push(listItem);
    }
  
    return resourceArray;
}
*/

// filter the full dataset using the passed criteria
function getResourceList(criteria, searchTerms = undefined) {

    const rawData = fs.readFileSync('static/assets/resource_list.json');
    const jsonData = JSON.parse(rawData);
    const filters = jsonData[0];
    let searchResult = jsonData.slice(); // do i really need to slice? can probably just use jsonData

    // first search the array if terms included 
    if (searchTerms) {
      searchTerms = searchTerms.toLowerCase(); // Convert searchTerms to lowercase for case-insensitive search
      searchResult = searchResult.filter((entry, index) => {
          if (index === 0) return true; // Include the filters array
          return Object.values(entry).some(value => {
              if (typeof value === 'string' && value.toLowerCase().includes(searchTerms)) {
                  return true;
              }
              return false;
          });
      });
    }

    let keys = Object.keys(criteria); // All the categories that will be filtered by
    let updatedFilters = [];
  
    for (let i = 0; i < filters.length; i++) {
  
      const category = filters[i];
      const currentKey = Object.keys(category)[0];
      const uniqueValues = getUniques(searchResult,currentKey);
  
      if (keys.includes(currentKey)) {

        const criteriaValues = criteria[currentKey]; 
  
        for (let j = searchResult.length - 1; j >= 1; j--) {
          
          const entry = searchResult[j];
          const entryValues = entry[currentKey];
          
          // If filter criteria not satisfied, splice this entry out of array
          if (!arraysIntersect(criteriaValues,entryValues)) {
            searchResult.splice(j, 1);
          }
        }
      }  
      let filterObject = {};
      filterObject[currentKey] = uniqueValues;
      updatedFilters.push(filterObject);
    }
    searchResult[0] = updatedFilters;
    return searchResult;
}

async function loadResults(resourceList, pageIndex) {
    
    const chunkSize = 25;
    let chunkedData = [];
    let response = null; 

    for (let i = 0; i < resourceList.length; i += chunkSize) {
        chunkedData.push(resourceList.slice(i, i + chunkSize));
    }

    const maxPageIndex = chunkedData.length - 1;

    // condition for no results 
    if ( chunkedData.length == 0 ) {
      pageIndex = 0;
      resultsHtml = '<h2 id="results-top-label" class="header-container reveal-element">No Results Found...</h2>';
      response = { resultsHtml, pageIndex };
    }
    // condition for errant request page index below minimum bound
    else if ( pageIndex < 0 ) {
      pageIndex = 0;
      response = { pageIndex };
    } 
    // condition for errant request page index above maximum bound
    else if ( pageIndex > maxPageIndex ) {
      pageIndex = maxPageIndex;
      response = { pageIndex };
    } 
    // standard condition 
    else {
      const displayedResults = chunkedData[pageIndex];
      const count = resourceList.length;
      const start = (pageIndex * 25) + 1;
      const end = start + displayedResults.length - 1;
      const resultsHtml = await ejs.renderFile('views/results.ejs', { displayedResults })

      response = { resultsHtml, pageIndex, maxPageIndex, start, end, count };
    }

    return response;
}

async function loadFilters(filters, criteria, reload = false) {

    let categoriesArray = [];
    let checkboxesArray = [];
    let checkedCheckboxes = [];
    for (i = 0; i < filters.length; i ++) {

      // create an array of the category for each filter
      const filter = filters[i];
      const category = Object.keys(filter)[0] // there is by design only one key:value pair in a criteria object
      categoriesArray.push(category)

      // create an array for the checkboxes corresponding to each category
      // replace empty strings with Not Specified -- recheck if can do this in json file 
      // would negate need for any logic here 
      let checkboxes = filter[category];
      for (j = 0; j < checkboxes.length; j++) {
        if (!checkboxes[j]) {
          checkboxes[j] = 'Not Specified';
        }
      };
      checkboxesArray.push(checkboxes);

      // create separate array to track which checkboxes are checked
      let tempArray = []
      for (checkbox of checkboxes) {
        const selected = criteria[category];
        if (Array.isArray(selected) && selected.includes(checkbox)) {
          tempArray.push('checked');
        } else {
          tempArray.push(null);
        }
      }
      checkedCheckboxes.push(tempArray);
    }

    // if this is a reload, extract only the form elements and return each as element of array 
    // this will allow state persistence without passing all state variables to server
    let response = null;
    if (reload == true) {
      response = [];
      const fullRender = await ejs.renderFile('views/filters.ejs', { categoriesArray, checkboxesArray, checkedCheckboxes });
      const $ = cheerio.load(fullRender);
      $('form').each((index, formElement) => {
        const formContent = $(formElement).html();
        response.push(formContent);
      });
    } else {
      response = await ejs.renderFile('views/filters.ejs', { categoriesArray, checkboxesArray, checkedCheckboxes });
    }

    return response;
}

async function suggestUpdate(data) {

  // access, parse, and modify data from resource updates file
  const resourceUpdates = fs.readFileSync('static/assets/resource_updates.json');
  const updatesJson = JSON.parse(resourceUpdates);
  updatesJson.push(data);

  // submit changes and save file
  const submissionData = JSON.stringify(updatesJson, null, 2);
  fs.writeFileSync('static/assets/resource_updates.json', submissionData);

  return true;
}

async function suggestNewResource(data) {

  // access, parse, and modify data from resource suggestions file
  const newResourceSuggestion = fs.readFileSync('static/assets/resource_suggestions.json');
  const newResourceJson = JSON.parse(newResourceSuggestion);
  newResourceJson.push(data);

  // submit changes and save file
  const submissionData = JSON.stringify(newResourceJson, null, 2);
  fs.writeFileSync('static/assets/resource_suggestions.json', submissionData);

  return true;
}


// returns true if the two arrays have at least one matching element, otherwise false 
function arraysIntersect(arr1, arr2) {
    for (const element1 of arr1) {
      for (const element2 of arr2) {
        if (element1.trim() === element2.trim()) {
          return true; // Found a matching element, arrays intersect
        }
      }
    }
    return false; // No matching elements found, arrays do not intersect
}

// takes an array of objects, returns all unique values across all objects for a given key
function getUniques(filteredArray, key) {
  
    let array = filteredArray.slice(1); // cut out the filter options
    uniques = [];
  
    for (entry of array) {
      values = entry[key];
  
      for (value of values) {
  
        trimmedValue = value.trim();
  
        if (!uniques.includes(trimmedValue)) {
          uniques.push(trimmedValue);
        }
      }
    }
    return uniques
}

module.exports = {
    fs,
    ejs,
    getResourceList,
    loadFilters,
    loadResults,
    arraysIntersect,
    getUniques,
    suggestUpdate,
    suggestNewResource
}