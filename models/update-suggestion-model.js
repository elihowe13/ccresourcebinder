const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
    timestamp: String,
    resource_id: String,
    resource_title: String,
    update_text: String,
});

const suggestionSchema = new mongoose.Schema({
    timestamp: String,
    county: String,
    title: String,
    description: String,
    contacts: String
});

const Update = mongoose.model('update', updateSchema);
const Suggestion = mongoose.model('suggestion', suggestionSchema);

module.exports = {
    Update,
    Suggestion
}; 