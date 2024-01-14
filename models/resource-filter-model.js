const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  filter_category: String, // example: "County", "Resource Type", etc.
  values: [String], // example: ["Pierce", "Clark", ...]
  display: Boolean,
  rank: Number,
});

const resourceSchema = new mongoose.Schema({
    title: String,
    description: String,
    contacts: [
      {
        contact_type: String, // example: "phone", "address", "website", etc.
        value: String, // example: "253-302-3826", "8811 S Tacoma Way #106, Lakewood, WA 98499", "http://actsrehab.org/about-layout-2/"
      },
    ],
    filters: [
        {
            filter_category: String, // example: "County"
            values: [String] // example ["Pierce", "Clark", ...]
        },
    ],
});

const Filter = mongoose.model('filter', filterSchema);
const Resource = mongoose.model('resource', resourceSchema);

module.exports = {
  Filter,
  Resource
};