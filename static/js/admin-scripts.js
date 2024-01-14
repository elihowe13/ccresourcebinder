// this is for adding new tags (filterable item details)
var autoCompleteOptions = null;

// pings server to render the editable html document for that resource
async function enableEditResource(e) {
    e.preventDefault();

    const resource = $(e.target).closest('.result-item');
    const resourceHtml = resource.html(); // will swap back if edit is canceled 
    const id = resource.attr("id");
    const queryUrl = new URLSearchParams('id=' + id);

    let result;
    try {
        const response = await fetch('/admin/edit-resource?' + queryUrl, {
            method: 'GET'
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();

    } catch (err) {
        console.error('Error', err); 
    };

    // pull in the data object that will be edited
    autoCompleteOptions = result.autoCompleteOptions;
    const editableHtml = result.html;

    // fade out the old element, replace html, toggle editable elements, and fade in
    resource.fadeOut(200, function() {
        $(this).html(editableHtml);
        editingStylesEvents(resource);
        addContact(resource); 
        $(".btn-delete").button()

        const cancelButton = resource.find('.cancel-edit');
        cancelButton.on({
            click: function(){
                resource.fadeOut(200, function(){
                    resource.html(resourceHtml).fadeIn(200);
                })
            }
        });
        $(this).fadeIn(200);
    });
}

// pings server to render the editable add resource modal 
async function openAddResourceModal(e) {
    e.preventDefault();

    let result;
    try {
        const response = await fetch('/admin/enable-new-resource', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();

    } catch (error) {
        console.error('Error:', error);
    }

    autoCompleteOptions = result.autoCompleteOptions;

    $("#add-new-resource-modal").html(result.resultHtml);

    // add the editing styles to the newly rendered html 
    const resource = $("#add-new-resource-modal").find(".result-item"); 
    editingStylesEvents(resource);
    addContact(resource);  

    const cancelButton = resource.find(".cancel-edit");
    cancelButton.on({
        click: function(){
            $("#add-new-resource-modal").fadeOut(200);
        }
    })

    $("#add-new-resource-modal").fadeIn(200);
}

// this function processes the user input into an object that can be used by the app and database
async function submitEditOrNew(e) {
    e.preventDefault();

    const resource = $(e.target).closest(".result-item");
    const id = resource.attr("id");
    let updatedResourceInfo = { id };

    const query = resource.find('.editable').serialize();

    // data from tags (these are the filterable categories)
    let tempFilters = {};
    resource.find(".tag.editable").each(function() {
        const key = $(this).attr("category");
        const value = $(this).text();
        if (!tempFilters[key]) {
            tempFilters[key] = [];
        }
        tempFilters[key].push(value);
    })
    let filters = [];

    Object.keys(tempFilters).forEach((key) => {
        const filterObject = { filter_category: key, values: tempFilters[key]};
        filters.push(filterObject);
    });
    updatedResourceInfo.filters = filters;

    // data from contact info div 
    let contacts = [];
    resource.find(".contacts-container").find(".editable")
        .each(function() {
            const type = $(this).attr("type");
            const value = $(this).text();
            contacts.push({ contact_type: type, value })
    })
    updatedResourceInfo.contacts = contacts;

    updatedResourceInfo.title = resource.find(".resource-title").text();
    updatedResourceInfo.description = resource.find(".resource-description").text();

    // validate the input 
    const requiredFilters = Object.keys(tempFilters).includes("County") && Object.keys(tempFilters).includes("Resource Type");
    if (!requiredFilters) {
        displayMessage("County and Resource Type are required.");
        return;
    } else if (contacts.length == 0) {
        displayMessage("You must add at least one contact.");
        return;
    } else if (updatedResourceInfo.title == '' || updatedResourceInfo.description == '') {
        displayMessage("Title and description are required.");
        return;
    };

    // submit the updated resource object to the server and reload non-editable version
    const requestBody = { updatedResourceInfo };

    // direct the fetch request depending on whether this is an edit for a new submission
    const submitNewResource = resource.closest("#add-new-resource-modal").length;
    const editFromDashboard =  resource.closest("#edit-resource-modal").length;
    console.log(submitNewResource, editFromDashboard);

    let result;
    try {
        let response;

        if (submitNewResource) {
            response = await fetch('/admin/submit-new-resource', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            response = await fetch('/admin/submit-resource-edit', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        };

        result = await response.json();

    } catch (err) {
        console.error('Error:', err);
    };

    // display a message of sucess or failure
    if (result.success) {
        if (submitNewResource) {
            displayMessage("The new resource has been saved to database.");
            $("#add-new-resource-modal").fadeOut(200);
        } else if (editFromDashboard) {
            displayMessage("Your edits have been submitted successfully.");
            $("#edit-resource-modal").fadeOut(200);
        } else {
            const updatedResource = $(result.resultHtml);
            resource.fadeOut(200, function(){
                resource.replaceWith(updatedResource);
                updatedResource.fadeIn(200);
            });
            displayMessage("Your edits have been submitted successfully.");
        };
    } else {
        displayMessage("There was an error saving your submission. Please try again or reload the page.", 3000);
    };
}

function openConfirmationModal(e) {
    e.preventDefault();

    // hide the edit modal if visible
    if ($(e.target).closest(".overlay").length > 0) {
        $(".overlay").fadeOut(200);
    };

    const resource = $(e.target).closest(".result-item");
    const title = resource.find('.resource-title').text();
    const resourceId = resource.attr("id");
  
    $("#delete-title").text(title);

    $("#confirm-delete").on({
        click: function(){
            deleteResource(resourceId);
            $("#confirmation-modal").fadeOut(200);
        }
    })

    $("#confirmation-modal").fadeIn(300);
}

async function deleteResource(resourceId) {

    let result;
    try {
        const response = await fetch('/admin/delete-resource', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resourceId }),
        });

        if (!response.ok) {
            $(".cancel-edit").trigger("click");
        } 

        result = await response.json();
          
    } catch (err) {
        console.error('Error: ', err);
    }

    if (result.success) {
        submitQuery();
    } else {
        $(".cancel-edit").trigger("click");
    }
}

/* the following three functions 
initiate styles and event listeners 
for editing various page elements */

function editingStylesEvents(resource) {

    // toggle contenteditable on elements of class editable
    $(".editable").each(function() {
        $(this).attr('contenteditable', true);

        // Shift+Enter will create a new line while editing resource description
        if ($(this).hasClass("resource-description")) {
            $(this).on({
                keydown: function(event) {
                    if (event.key == 'Enter' && !event.shiftKey) {
                        $(this).trigger("blur");
                    }
                }
            })
        } 
        // keydown Enter will trigger blur on all other editable elements except description
        else {
            $(this).on({
                keydown: function(event) {
                    if (event.key == 'Enter') {
                        event.preventDefault();
                        $(this).trigger('blur');
                    } 
                }
            });
        }
    })

    // special user interactions for resource tags
    $(".tag.editable").on({
        blur: function(){
            let text = $(this).text().trim();

            // delete empty tags, or remove whitespace
            if (text == "") {
                $(this).remove();
            } else {
                $(this).text(text);
            }

            // min-width was previously set for better visibility of empty new tag element
            $(this).css("min-width","initial");
        }
    })

    // special user interaction with contact info lines 
    $(".contact-item .editable").on({
        blur: function(){
            let text = $(this).text().trim();

            // delete empty contact lines, or remove whitespace
            if (text == "") {
                $(this).parent().remove();
            } else {
                $(this).text(text);
            }
        }
    })

    const submitButton = resource.find(".btn-submit");
    const cancelButton = resource.find(".btn-cancel");
    cancelButton.button();
    submitButton.button();
}

function tagAdd(e) {
    const resource = $(e.target).closest(".result-item");
    const addTagButton = $(e.target).closest("p");
    const category = addTagButton.attr("category");

    const newTag = $("<p>", {
        type: "text", 
        style: "min-width: 100px;", // set for better visibility, as no text will be present initially
        class: "tag editable",
        category:`${ category }`,
    })

    // autocomplete draws from filter options 
    newTag.autocomplete({
        source: autoCompleteOptions[category]
    });

    newTag.insertBefore(addTagButton);
    editingStylesEvents(resource);
    newTag.trigger("focus");
}

function addContact(resource) {

    // event listener cancels the drag-drop and re-initializes dropdown menu
    const disableDragDrop = resource.find(".disable-drag-drop");
    disableDragDrop.on("click", function(){
            $(this).button("destroy").css("display","none");
            $(".contacts-container.sortable").sortable("destroy");
            contactTypeSelector.css("display","initial").selectmenu();
            contactTypeSelector.val("").selectmenu("refresh");
        })
    .css("display","none");

    // initialize the dropdown menu, apply custom classes
    const contactTypeSelector = resource.find(".contact-type-selector");
    const customClasses = contactTypeSelector.attr("class");
    contactTypeSelector.selectmenu({
        classes: {
            "ui-selectmenu-menu": customClasses
          }
    });

    // handle all selection of all dropdown options
    contactTypeSelector.on("selectmenuselect", function() {
        const type = $(this).val();
        let newContact = null;
        let image = null;

        if (type == 'label') {
            console.log("triggerd");
            newContact = $('<h4 class="editable" type="label">New Label</h4>');
            contactTypeSelector.val("").selectmenu("refresh");
        } else if (type == 'phone') {
            image = $('<img src="assets/phone.svg" alt="SVG Image">');
            newContact = ('<p class="editable" type="phone">New Phone</p>');
            contactTypeSelector.val("").selectmenu("refresh");
        } else if (type == 'address') {
            image = $('<img src="assets/pin.svg" alt="SVG Image">');
            newContact = ('<p class="editable" type="address">New Address</p>');
            contactTypeSelector.val("").selectmenu("refresh");
        } else if (type == 'website') {
            image = $('<img src="assets/globe.svg" alt="SVG Image">');
            newContact = ('<a class="editable" type="website">New Website</a>');
            contactTypeSelector.val("").selectmenu("refresh");
        } else if (type == 'sort') {
            $(".contacts-container.sortable").sortable({
                axis: "y", // Specify the sorting direction (vertical in this case)
                cursor: "grabbing", // Change cursor style while dragging
                items: ".contact-item"
              });

            contactTypeSelector.selectmenu("destroy").css("display","none");
            disableDragDrop.css("display","initial").button();
        }

        // insert the new contact div into the document
        const addNewContactDiv = resource.find(".add-new-contact");
        const newContactDiv = $('<div class="contact-item">')
            .append(image, newContact)
            .insertBefore(addNewContactDiv);

        editingStylesEvents(resource);
    })
}