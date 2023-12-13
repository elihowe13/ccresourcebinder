// declare the four state variables that uniquely identify a user session 
var criteria = {}; // full dataset, no filters 
var searchTerms = "";
var expanded = [true]; // by default first filter expanded, others collapsed
var pageIndex = 0; 
var selected = [];

function collapseFilter(e) {

    // toggle the selected filter field
    if (e.target.tagName != 'A') {
        const filter = e.target.closest('.filter-field');
        filter.classList.toggle('collapsed');
    }

    // update the relevant state variable 
    const filterFields = document.getElementsByClassName('filter-field');
    for (let i = 0; i < filterFields.length; i++) {
        expanded[i] = filterFields[i].classList.contains('collapsed') ? false : true;
    }
}

function changePage(e, direction) {
    e.preventDefault();

    // true = increment, false = decrement 
    pageIndex = direction ? pageIndex + 1 : pageIndex - 1;
    const requestBody = [criteria, searchTerms, selected, expanded, pageIndex];

    fetch('/change-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
        .then(response => response.json())
        .then(result => {
            pageIndex = result.pageIndex;
            if ( result.html != undefined ) {
                const rightPanel = document.getElementById('right-panel');
                rightPanel.innerHTML = result.html; 
            }
        })
        .catch(error => {
          console.error('Error:', error);
        });
}

function submitFilters(resetAll = false, e = null) {

    criteria = updateCriteria();

    // if resetting all filters, return searchTerms and criteria to default values 
    if (resetAll) {
        e.preventDefault();
        searchTerms = "";
        criteria = {};
        selected = [];
    }

    const requestBody = [criteria, searchTerms, selected, expanded, pageIndex];

    fetch('/submit-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
        .then(response => response.json())
        .then(result => {
            const rightPanel = document.getElementById('right-panel');
            rightPanel.innerHTML = result.rightPanel; 

            const leftPanel = document.getElementById('left-panel');
            leftPanel.innerHTML = result.leftPanel;
        })
        .catch(error => {
          console.error('Error:', error);
        });
}

// handler for resetting a single filter field
function handleReset(e) { 
    e.preventDefault();

    const filter = e.target.closest('.enable-reset');
    const checkboxes = filter.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        checkbox.checked = false; 
    });

    submitFilters();
}

function submitSearch() {

    // capture the search terms and then clear input field
    const searchInput = document.getElementById('search-input');
    searchTerms = searchInput.value;

    if (searchTerms != "") {
        searchInput.value = null;
        submitFilters()
    }
}

function clearSearch() {
    searchTerms = "";
    submitFilters();
}

function updateCriteria() {

    criteria = {};
    const filterFields = document.getElementsByClassName('filter-field');

    // loop through all filter fields
    for (let i = 0; i < filterFields.length; i++) {

        selected[i] = false;

        const categoryName = filterFields[i].getAttribute('category').trim();
        const checkboxes = filterFields[i].getElementsByClassName('checkbox');
        const values = [];

        // loop through all checkboxes and record values of all checked 
        for (let j = 0; j < checkboxes.length; j++) {
            const value = checkboxes[j].value.trim();
            if (checkboxes[j].checked) {
                values.push(value);
            }
        }
        
        // create a separate key:value pair for each filter category and its selected values
        if (values.length > 0) {
            criteria[categoryName] = values;
            selected[i] = true;
        }
    }

    return criteria;
}

function openSuggestionModal(e) {
    e.preventDefault();
    const suggestionModal = document.getElementById("suggestion-modal");
    suggestionModal.style.display = "block";
}

function openUpdateModal(e) {
    e.preventDefault()
    const titleElement = e.target.parentElement.querySelector('.resource-title');
    const title = titleElement.textContent;
    const updateModal = document.getElementById("update-modal");
    const updateTitle = document.getElementById("update-title");
    updateTitle.textContent = title;
    updateModal.style.display = "block";
}

function suggestUpdate() {

    const updateText = document.getElementById("update-text").value;
    const resourceTitle = document.getElementById("update-title").textContent;

    if (updateText == "") {
        alert("Text field cannot be empty.");
        return;
    }

    const requestBody = { updateText, resourceTitle };

    fetch('/suggest-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
        .then(response => response.json())
        .then(result => {
            if (result) {
                closeModal();
                alert("Update suggestion submitted successfully.");
            }
        })
        .catch(error => {
          console.error('Error:', error);
        });

    closeModal();
}

function submitSuggestion() {

    const resourceTitle = document.getElementById("suggestion-title").value
    const county = document.getElementById("suggestion-county").value
    const description = document.getElementById("suggestion-description").value;
    const contact = document.getElementById("suggestion-contact").value;

    const requestBody = { resourceTitle, county, description, contact };

    if (Object.values(requestBody).some( element => element == "" )) {
        alert("All text fields are required.");
        return;
    }

    fetch('/suggest-new-resource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
        .then(response => response.json())
        .then(result => {
            if (result) {
                closeModal();
                alert("New resource suggestion submitted successfully.");
            }
        })
        .catch(error => {
          console.error('Error:', error);
        });

    closeModal();
}

// Function to close the custom alert
function closeModal() {
    modals = document.getElementsByClassName("overlay");

    for (modal of modals) {
      modal.style.display = "none"
      textAreas = modal.getElementsByTagName("textarea");

      for (textArea of textAreas) {
        textArea.value = "";
      }
    }
}

function login(e) {
    e.preventDefault();
    alert(`Do you like apples? \n\nWell this link doesn't go anywhere yet \n\nHow do you like them apples?`);
}

function test() {
    const test = document.getElementsByClassName('reset-link');
    for (element of test) {
        element.classList.toggle('hide-element');
        element.classList.toggle('reveal-element');
    }
}