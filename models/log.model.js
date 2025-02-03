const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    content: String,
    typeData: String
}, {
    timestamps: true
})

module.exports = mongoose.model('log', logSchema);