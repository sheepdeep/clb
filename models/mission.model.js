const moment = require('moment');
const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
    phone: String,
    amount: Number,
    bonus: Number,
    count: Number
}, {
    timestamps: true
})

module.exports = mongoose.model('Mission', missionSchema);