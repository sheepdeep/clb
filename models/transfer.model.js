const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    transId: {
        type: String,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    firstMoney: Number,
    amount: Number,
    lastMoney: Number,
    comment: String,
    details: Object
}, {
    timestamps: true
})

module.exports = mongoose.model('transfer', transferSchema);