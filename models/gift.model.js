const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    amount: Number,
    playCount: Number,
    limit: Number,
    players: Array,
    status: {
        type: String,
        default: 'active'
    },
    type: String,
    expiredAt: Date
}, {
    timestamps: true
})

module.exports = mongoose.model('giftCode', giftSchema);