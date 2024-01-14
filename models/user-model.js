const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    microsoftId: String,
    email: String,
    lastName: String,
    firstName: String
});

const User = mongoose.model('user', userSchema);

module.exports = User; 