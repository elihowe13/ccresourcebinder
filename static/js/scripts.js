// declare the state variables that will be passed to server 
var criteria = {}; 
var searchTerms = "";
var pageIndex = 0; 
var maxPageIndex = null;

function changePage(e, direction) {
    e.preventDefault();
    const oldPageIndex = pageIndex;

    // true = increment, false = decrement 
    pageIndex = direction ? pageIndex + 1 : pageIndex - 1;
    const requestBody =  { criteria, searchTerms, pageIndex }

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
            if ( result.resultsHtml != undefined ) {
                $("#search-results, #results-end, #results-start").fadeOut(200, function() {
                    $("#search-results").html(result.resultsHtml);
                    $("#results-start").text(result.start);
                    $("#results-end").text(result.end);
                    $("#search-results, #results-end, #results-start").fadeIn(200);
                })
            }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    
    // handle revealing and hiding next/previous page links
    if (pageIndex == 0) {
        $(".previous-link").fadeTo(200,0);
    } else if (pageIndex == 1 && oldPageIndex == 0) {
        $(".previous-link").fadeTo(200,1);
    } else if (pageIndex == maxPageIndex) {
        $(".next-link").fadeTo(200,0); 
    } else if (pageIndex == maxPageIndex - 1 && oldPageIndex == maxPageIndex) {
        $(".next-link").fadeTo(200,1);
    }
}

function submitSearch() {

    // Capture the search terms and clear the input field
    searchTerms = $('#search-input').val();
    $('#search-input').val('');

    // If search terms present, fill the search terms display box with text and make it visible
    if (searchTerms != "") {
        $('#search-terms').text(searchTerms);
        $('#search-terms-display').fadeIn(300);
        $('#search-terms-display').css('display','flex');
    } else {
        $('#search-terms-display').fadeOut(300)
    }

    // Submit the filters
    submitFilters();
}

function submitFilters(e = null) {

    // this function will reset reults to page 1, and get updated status of checkboxes 
    // it will not update searchTerms - that will only be triggered with SubmitSearch
    criteria = updateCriteria();
    pageIndex = 0;

    const requestBody = { criteria, searchTerms, pageIndex };

    fetch('/submit-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
        .then(response => response.json())
        .then(result => {
            maxPageIndex = result.maxPageIndex;
            $("#search-results, #results-end, #results-start, #results-count").fadeOut(100, function() {
                $("#search-results").html(result.resultsHtml);
                $("#results-start").text(result.start);
                $("#results-end").text(result.end);
                $("#results-count").text(result.count);
                $("#search-results, #results-end, #results-start, #results-count").fadeIn(200);
            })

            // toggle page changing links visible/invisible
            // fadeTo method preserves element size 
            if (maxPageIndex == 0) {
                $(".previous-link, .next-link").fadeTo(200,0);
            } else {
                $(".next-link").fadeTo(200,1);
            }

            // this function only reloads the checkbox forms
            // this allows us to maintain the state of the filter divs without passing complete state to server
            const formsArray = result.formsArray;
            $('.checkbox-form').html(function(index) {
                return formsArray[index];
            });
        })
        .catch(error => {
          console.error('Error:', error);
        });
}

// handler for resetting a single filter field. Reset all filters is handled by optional parameter of submitFilters
function handleReset(e,resetAll = false) { 
    e.preventDefault();

    let $checkboxes = resetAll ? $('input[type="checkbox"]') : $(e.target).closest('.filter-field').find('input[type="checkbox"]');
    $checkboxes.prop('checked', false);

    submitFilters();
}

function clearSearch() {
    searchTerms = "";
    submitSearch();

    // make the search terms display box hidden 
    $("#search-terms-display").fadeOut(200);
}

function updateCriteria() {

    criteria = {};
    const filterFields = $('.filter-field');

    // loop through all filter fields
    for (let i = 0; i < filterFields.length; i++) {

        const categoryName = $(filterFields[i]).attr('category').trim();
        const checkboxes = $(filterFields[i]).find('.checkbox');
        const values = [];

        // loop through all checkboxes and record values of all checked 
        for (let j = 0; j < checkboxes.length; j++) {
            const value = checkboxes[j].value.trim();
            if (checkboxes[j].checked) {
                values.push(value);
            }
        }

        // create a separate key:value pair for each filter category and its selected values
        // also make the reset filter link visible if not already, hide if clearing filter
        const resetLink = filterFields[i].querySelector('.reset-link');
        if (values.length != 0) {
            criteria[categoryName] = values;

            if (resetLink.classList.contains('fade-out')) {
                resetLink.classList.remove('hidden');
                resetLink.classList.replace('fade-out','fade-in');
            }
        } else {
            resetLink.classList.replace('fade-in','fade-out');
        }
    }

    // make reset all visible if needed
    if (Object.keys(criteria).length === 0) {
        $('#reset-all-link').fadeOut({duration: 150, easing: "swing"});
    } else {
        $('#reset-all-link').fadeIn({duration: 150, easing: "swing"});
    }

    return criteria;
}

function openUpdateModal(e) {
    e.preventDefault();
    const title = $(e.target).siblings('.resource-title').text();
    $("#update-title").text(title);
    $("#update-modal").fadeIn(300);
  }
  

function suggestUpdate() {

    const updateText = $("#update-text").value;
    const resourceTitle = $("#update-title").textContent;

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

function suggestNewResource() {

    const resourceTitle = $("#suggestion-title").val();
    const county = $("#suggestion-county").val();
    const description = $("#suggestion-description").val();
    const contact = $("#suggestion-contact").val();

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

function login(e) {
    e.preventDefault();
    alert(`Do you like apples? \n\nWell this link doesn't go anywhere yet \n\nHow do you like them apples?`);
}