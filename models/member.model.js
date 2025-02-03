const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    name: String,
    phone: String,
    event: {
        count: {
            type: Number,
            default: 0
        },
        countWheelDay: {
            type: Number,
            default: 0
        },
    }
}, { timestamps: true })

module.exports = mongoose.model('member', memberSchema);