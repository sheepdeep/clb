const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
    phone: String,
    transId: String,
    amount: Number,
    bonus: Number,
    percent: String
}, {
    timestamps: true
})

module.exports = mongoose.model('refund-bill', refundSchema);