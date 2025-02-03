const mongoose = require('mongoose');

const musterSchema = new mongoose.Schema({
    code: Number,
    timeDefault: { type: Number, default: 600 },
    amount: { type: Number, default: 0 },
    win: String,
    players: Array,
    status: { type: String, default: 'active' }
}, {
    timestamps: true
})

module.exports = mongoose.model('Muster', musterSchema);