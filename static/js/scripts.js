

var pageIndex = 0;
var searchTerms = "";

loadLeftJs();

function loadLeftJs() {
    const filterFields = document.getElementsByClassName('filter-field');
    const subheadings = document.getElementsByClassName('subheading-container');

    for (let i = 0; i < filterFields.length; i++ ) {
        subheadings[i].addEventListener('click', function (e) {
            e.preventDefault();
            if (e.target.tagName != 'A') {
                filterFields[i].classList.toggle('collapsed');
            }
        })
    }
}

function changePage(direction) {

    pageIndex = direction ? pageIndex + 1 : pageIndex - 1;

    const state = getState();
    fetch('/change-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
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

function submitFilters(search = false) {

    const state = getState(search);

    fetch('/submit-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
      })
        .then(response => response.json())
        .then(result => {
            const rightPanel = document.getElementById('right-panel');
            rightPanel.innerHTML = result.rightPanel; 

            const leftPanel = document.getElementById('left-panel');
            leftPanel.innerHTML = result.leftPanel;
            loadLeftJs();
        })
        .catch(error => {
          console.error('Error:', error);
        });
}

function handleReset(e, all = false) {
    
    e.preventDefault();

    if (all) {
        clearSearch();
    }

    const filter = e.target.closest('.enable-reset');
    const checkboxes = filter.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false; 
    });
    submitFilters();

    return false;
}

function clearSearch() {
    searchTerms = "";
    submitFilters();
}

function getState(search) {

    // capture the search terms from input then clear input 
    if (search) {
        const searchInput = document.getElementById('search-input');
        searchTerms = searchInput.value;
        searchInput.value = null;
    }

    // then collect filter criteria
    let criteria = {};
    let expanded = [];
    const filterFields = document.getElementsByClassName('filter-field');

    for (let i = 0; i < filterFields.length; i++) {

        expanded[i] = filterFields[i].classList.contains('collapsed') ? false : true;
        const categoryName = filterFields[i].getAttribute('category').trim();
        const checkboxes = filterFields[i].getElementsByClassName('checkbox');
        const values = [];

        for (let j = 0; j < checkboxes.length; j++) {
            const value = checkboxes[j].value.trim();
            if (checkboxes[j].checked) {
                values.push(value);
            }
        }
        
        if (values.length > 0) {
            criteria[categoryName] = values;
        }
    }

    return [criteria,searchTerms,expanded,pageIndex];
}

function openSuggestionModal(e) {
    e.preventDefault();
    const suggestionModal = document.getElementById("suggestion-modal");
    suggestionModal.style.display = "block";
}

function openUpdateModal(resourceTitle) {
    const updateModal = document.getElementById("update-modal");
    const updateTitle = document.getElementById("update-title");
    updateTitle.textContent = resourceTitle;
    updateModal.style.display = "block";
}

// Function to submit the custom alert
function submitUpdate() {
    const text = document.getElementById("update-text").value;
    const title = document.getElementById("update-title").textContent;

    if (text != "") {
      alert("this doesn't go anywhere yet");
    }
    closeModal();
}

function submitSuggestion() {

  const title = document.getElementById("suggestion-title").value
  const county = document.getElementById("suggestion-county").value
  const description = document.getElementById("suggestion-description").value;
  const contact = document.getElementById("suggestion-contact").value;

  alert("this doesn't go anywhere yet");
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
    alert("this does't go anywhere yet");
}