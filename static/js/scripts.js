var searchTerms = "";
var pageIndex = 0; 
var oldPageIndex = 0;
var pageLength = 25;
var resultsCount = parseInt($("#results-count").text());
var maxPageIndex = Math.ceil(resultsCount / pageLength) - 1;

function captureSearchTerms() {

    // Capture the search terms and clear the input field
    searchTerms = $('#search-input').val();
    $('#search-input').val('');

    // If search terms present, fill the search terms display box with text and make it visible
    if (searchTerms == "") {
        return;
    } else {
        $('#search-terms').text(searchTerms);
        $('#search-terms-display').fadeIn(300);
        $('#search-terms-display').css('display','flex');
    }

    // filter the results 
    submitQuery();
}

function clearSearch() {
    searchTerms = "";
    submitQuery();

    // make the search terms display box hidden 
    $("#search-terms-display").fadeOut(200);
}

async function submitQuery(e = null) {

    if (e) {
        e.preventDefault();
    }

    // construct url query 
    const formData = $("form.checkbox-form").serialize();
    const queryUrl = new URLSearchParams(formData);
    queryUrl.append('searchTerms', searchTerms);
    queryUrl.append('pageLength', pageLength);

    // handle page changes and abort if not a valid page index
    if (pageIndex != oldPageIndex) {
        if (pageIndex > maxPageIndex) {
            pageIndex = maxPageIndex;
            return;
        } else if (pageIndex < 0) {
            pageIndex = 0;
            return ;
        };
        queryUrl.append('pageIndex', pageIndex);
    } else {
        pageIndex = 0;
        oldPageIndex = 0;
    };

    // query server and handle potential errors
    let result; 
    try {
        const response = await fetch('/?' + queryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();

    } catch (err) {
        console.error('Error:', err);
    }

    // send result to other functions to handle page update 
    updatePageElements(result, e); 
}

/* the following function receives search results 
and updated filters info and then fades out/in
on the relevant page elements */ 

function updatePageElements(result, e = null) { 

    // if there are no search results returned
    if (result.noResults) {
        $("#search-results, #results-top-label, #results-bottom-label").fadeOut(200, function() {
            $("#search-results").html(result.resultsHtml);
            $("#search-results").fadeIn(200);
        })
    }

    // if this is a page change only update results, not filters panel
    else if (pageIndex != oldPageIndex) {

        const resultsStart = pageIndex * pageLength + 1;
        const resultsEnd = pageIndex == maxPageIndex ? resultsCount : (pageIndex + 1) * pageLength;

        // fade out the elements that are updating, update them, fade back in 
        $("#search-results, #results-end, #results-start").fadeOut(200, function() {
            $("#search-results").html(result.resultsHtml);
            $("#results-start").text(resultsStart);
            $("#results-end").text(resultsEnd);
            $("#results-bottom-label p").text(`Showing Results ${resultsStart} - ${resultsEnd} of ${resultsCount}`);
            $("#search-results, #results-end, #results-start").fadeIn(200);
        })

        // toggle page changing links visible/invisible
        // fadeTo method preserves element size, disable pointer events prevents accidental clicks
        if (pageIndex == 0) {
            $(".previous-link").fadeTo(200,0).css('pointer-events','none'); 
        } else if (pageIndex == 1 && oldPageIndex == 0) {
            $(".previous-link").fadeTo(200,1).css('pointer-events','inherit');
        } 
        
        if (pageIndex == maxPageIndex) {
            $(".next-link").fadeTo(200,0).css('pointer-events','none'); 
        } else if (pageIndex == maxPageIndex - 1 && oldPageIndex == maxPageIndex) {
            $(".next-link").fadeTo(200,1).css('pointer-events','inherit');
        }

        oldPageIndex = pageIndex;

    // if this response comes from adding more filters or search terms, update both results and filters panels
    } else {

        resultsCount = result.resultsCount;
        maxPageIndex = Math.ceil(resultsCount / pageLength) - 1;
        const resultsEnd = pageIndex == maxPageIndex ? resultsCount : (pageIndex + 1) * pageLength;

        $("#results-start, #results-end, #results-count, #search-results, #results-bottom-label").fadeOut(200, function() {

            // replace all the relevant text and html 
            $("#search-results").html(result.resultsHtml);
            $("#results-start").text("1");
            $("#results-end").text(resultsEnd);
            $("#results-count").text(resultsCount);
            $("#results-bottom-label p").text(`Showing Results 1 - ${resultsEnd} of ${resultsCount}`);

            // this conditional would apply if there were no results from the previous search 
            if ($("#results-top-label, #results-bottom-label").is(":hidden")) {
                $("#results-top-label, #search-results, #results-bottom-label").fadeIn(200);
            } else {
                $("#results-start, #results-end, #results-count, #search-results, #results-bottom-label").fadeIn(200);
            }
        })

        // toggle page changing links visible/invisible
        // fadeTo method preserves element size, disable pointer events prevents accidental clicks
        if (maxPageIndex === 0) {
            $(".previous-link, .next-link").fadeTo(200,0).css('pointer-events','none');
        } else {
            $(".next-link").fadeTo(200,1).css('pointer-events','inherit');
        }
    
        // this function only updates the filter forms downstream of the one clicked
        let lastClickedIndex;
        if (e) {
            const filterForms = document.querySelectorAll('form.checkbox-form');
            const lastClicked = e.target.closest('form.checkbox-form');
            lastClickedIndex = Array.from(filterForms).indexOf(lastClicked);
        } else {
            lastClickedIndex = -1;
        }

        // replace the html in all the forms with updated html 
        const newFilterForms = $(result.filtersHtml).find('form.checkbox-form');
        $('form.checkbox-form').each(function(index) {
            if (index > lastClickedIndex) {
                $(this).fadeOut(200, function(){
                    $(this).html(newFilterForms.eq(index).html());
                    $(this).fadeIn(200);
                });
            };
        });

        // logic to toggle reset links
        newFilterForms.each(function(index) {
            const checkboxes = $(this).find('input[type="checkbox"]').toArray();
            const selected = checkboxes.some(checkbox => checkbox.checked);
            const resetLink = $(".reset-link").eq(index);
            const linkHidden = resetLink.is(":hidden");

            if (selected && linkHidden) {
                resetLink.fadeIn(200);
            } else if (!selected && !linkHidden) {
                resetLink.fadeOut(200);
            };
        });

        // toggle reset all link if search terms present or reset links visible
        const checkboxes = $('input[type="checkbox"]');
        const showResetAll = checkboxes.filter(function(){return this.checked}).length > 0 || searchTerms;
        const resetAllVisible = $("#reset-all-link").is(":visible");

        if (showResetAll && !resetAllVisible) {
            $("#reset-all-link").fadeIn(200);
        } else if (!showResetAll && resetAllVisible) {
            $("#reset-all-link").fadeOut(200);
        }
    }
}

function handleReset(e) { 
    e.preventDefault();

    const resetAll = e.target.id == "reset-all-link";

    if (resetAll) {
        const leftPanel = document.getElementById("left-panel");
        const checkboxes = leftPanel.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        clearSearch();
    } else {
        const filter = e.target.closest('.filter-field');
        const checkboxes = filter.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        submitQuery();
    } 
}

function openUpdateModal(e) {
    e.preventDefault();
    const resource = $(e.target).closest(".result-item");
    const title = resource.find('.resource-title').text();
    const id = resource.attr("id");
    $("#update-title").text(title);
    $('input[name="updateTitle"]').val(title);
    $('input[name="updateId"]').val(id);
    $("#update-modal").fadeIn(300);
}

//display a brief message in top left corner 
function displayMessage(message, timeout = 2000) {
    $("#messageBox").text(message).fadeIn(200, function(){
        setTimeout(() => {
            $(this).fadeOut(200);
        }, timeout);
    });
}

//make sure all form fields filled out display messasge and highlight if not 
function validateForm(form, message = true){

    const inputFields = form.find("input, textarea");
    let someFieldEmpty = false; 

    inputFields.each(function(){
        if (!$(this).val()) {
            $(this).css("border-color", "red")
                .on({
                    keydown: function(){
                        $(this).css("border-color","inherit");
                    },
                    blur: function(){
                        validateForm(form, false);
                    }
                })
            someFieldEmpty = true;
        }
    });

    if (someFieldEmpty && message) {
        displayMessage("All fields are required");
        return false;
    } else {
        return true;
    }
}


$(".modal form").on({
    submit: async function(event){
        event.preventDefault();

        const valid = validateForm($(this));
        if (!valid) {
            return; 
        }

        const formData = $(this).serialize();

        let result;
        try {
            const response = await fetch('/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            } else {
                result = await response.json();
            }
        } catch (err) {
            console.error(err);
        }

        if (result.success) {
            // clear form and hide modal
            $(".overlay").fadeOut(200);
            $(".modal form").trigger('reset');
            // flash success message; 
            displayMessage('Your response has been submitted successfully');
        } else {
            displayMessage('There was an error submitting your response. Please try again.', 3000);
        }
    },
    reset: function() {
        this.reset();
        $(".overlay").fadeOut(200);
    }
})

$(".btn-cancel, .btn-submit").button();

// pop out menu for tablets and mobile
document.addEventListener('DOMContentLoaded', function() {
    var menuButton = document.getElementById('menu-button');
    var leftPanel = document.getElementById('left-panel');
  
    menuButton.addEventListener('click', function() {
      leftPanel.classList.toggle('active');
    });
});

// initialize dropdown for page length and add custom classes
const pageLengthSelector = $("#page-length-selector");
const customClasses = pageLengthSelector.attr("class");
pageLengthSelector.selectmenu({
    classes: {
        "ui-selectmenu-button": customClasses
      }
})
    .on("selectmenuselect", function(){
        pageLength = parseInt($(this).val());
        submitQuery();
    });