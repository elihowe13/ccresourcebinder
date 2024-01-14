
// an edit modal only exists in the dashboard, but this shares functions with editing feature of binder page
async function openEditModal(resourceId) {

    const queryUrl = new URLSearchParams('id=' + resourceId);

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

    autoCompleteOptions = result.autoCompleteOptions;
    const editableHtml = result.html;

    // replace html in edit modal, toggle editable elements, and fade in
    const resourceToEdit = $("#edit-resource-modal").find(".result-item");
    resourceToEdit.attr("id", resourceId);
    resourceToEdit.html(editableHtml);
    editingStylesEvents(resourceToEdit);
    addContact(resourceToEdit);
    $(".btn-delete").button();
    $(".btn-cancel").on({
        click: function() {
            $("#edit-resource-modal").fadeOut(200);
        }
    })
    $("#edit-resource-modal").fadeIn(200);
}

// this is for deleting rows from the dashboard tables
async function deleteDocument(e, documentType, deleteAll = false) {
    e.preventDefault();

    let documentId;
    let requestBody;
    let tableRow;
    if (deleteAll) {
        requestBody = { documentType, deleteAll };
    } else {
        tableRow = $(e.target).closest("tr");
        documentId = tableRow.attr("id");
        requestBody = { documentType, documentId, deleteAll };
    }

    let result;
    try {
        const response = await fetch('/admin/delete-document', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        result = await response.json();
          
    } catch (err) {
        console.error('Error: ', err);
    }

    if (result.success) {
        if (result.deleteAll) {

        } else {
            tableRow.remove();
        }
    } 
}

//display a brief message in top left corner 
function displayMessage(message, timeout = 2000) {
    $("#messageBox").text(message).fadeIn(200, function(){
        setTimeout(() => {
            $(this).fadeOut(200);
        }, timeout);
    });
}

async function enableEditFilter(e) { 

    const filterId = $(e.target).attr("id");

    // highlight the selected option
    $("#filter-category-menu .highlight").toggleClass("highlight");
    $(e.target).toggleClass("highlight");

    const queryUrl = new URLSearchParams('id=' + filterId);

    let result;
    try {
        const response = await fetch('/admin/edit-filter?' + queryUrl, {
            method: 'GET'
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();

    } catch (err) {
        console.error('Error', err); 
    };

    const editFilterHtml = result.editFilterHtml;
    const displayFilter = result.displayFilter;

    $("#filter-options").fadeOut(200, function() {
        $(this).html(editFilterHtml);
        $("#filter-options-menu").menu({
            classes: {
                "ui-menu": "filter-options-menu",
                "ui-menu-item": "menu-item"
            }
        });
        $(this).fadeIn(200);
    });

    $("#display-filter").prop("checked", displayFilter).attr("name", filterId);

    $("#filter-options-menu .ui-menu-item").on({
        click: function() {
            $("#filter-options-menu .highlight").toggleClass("highlight");
            $(this).toggleClass("highlight");
        }
    })
};

async function submitFilterEdit(e) {

    const filterId = $(e.target).attr("name");
    const displayFilter = $(e.target).prop("checked");

    const requestBody = { filterId, displayFilter }

    let result;
    try {
        const response = await fetch('/admin/submit-filter-edit', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        };

        result = await response.json();

    } catch (err) {
        console.error('Error:', err);
    };

    if(result) {
        displayMessage("Changes have been saved.");
    }
}

// initialize filter category menu and apply custom classes 
$("#filter-category-menu").menu({
    classes: {
        "ui-menu": "filter-category-menu",
        "ui-menu-item": "menu-item"
    }
});

// displays full text content of table cells 
$(".table tbody td").on({
    click: function() {
        this.classList.toggle("wrap-text");
    }
});

