// models/faculty.js
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, // avoid duplicates
    },
    password: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Faculty', facultySchema);