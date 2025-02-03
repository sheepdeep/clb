const mongoose = require('mongoose');

const historyTaiXiu = new mongoose.Schema({
    turn: String,
    transId: {
        type: String,
        unique: true
    },
    phone: String,
    partnerId: String,
    partnerName: String,
    amount: Number,
    bonus: Number,
    description: String,
    comment: String,
    action: Array,
    time: String,
    status: String
}, { timestamps: true })

module.exports = mongoose.model('history-taixiu', historyTaiXiu);