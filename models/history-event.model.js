const mongoose = require('mongoose');

const historyEvent = new mongoose.Schema({
    phone: String,
    amount: Number,
    status: String,
    type: String,
    code: String
}, { timestamps: true })

module.exports = mongoose.model('history-event', historyEvent);