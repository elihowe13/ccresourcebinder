const fs = require('fs');
const ejs = require('ejs');

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

// filter the passed dataset using the passed criteria
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

async function loadRightPanel(resourceList, pageIndex) {
    
    const chunkSize = 25;
    const chunkedData = [];
    let response = null; 

    for (let i = 0; i < resourceList.length; i += chunkSize) {
        chunkedData.push(resourceList.slice(i, i + chunkSize));
    }

    const maxPageIndex = chunkedData.length - 1;

    if ( pageIndex < 0 ) {
      pageIndex = 0;
      response = { "pageIndex": pageIndex }
    } else if ( pageIndex > maxPageIndex ) {
      pageIndex = maxPageIndex;
      response = { "pageIndex": pageIndex }
    } else {
      const displayedResults = chunkedData[pageIndex];
      const resultsCount = resourceList.length;
      const resultsStart = (pageIndex * 25) + 1;
      const resultsEnd = resultsStart + displayedResults.length - 1;
      const html = await ejs.renderFile('views/right_panel.ejs', { displayedResults, resultsStart, resultsEnd, resultsCount, pageIndex, maxPageIndex })

      response = {
        "pageIndex": pageIndex,
        "html": html
      }

    }
    return response;
}

async function loadLeftPanel(filters, state) {
    const criteria = state[0];
    const searchTerms = state[1]
    const expanded = state[2];
    const html = await ejs.renderFile('views/left_panel.ejs', { filters, criteria, searchTerms, expanded });

    return html;
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
    loadLeftPanel,
    loadRightPanel,
    arraysIntersect,
    getUniques
}