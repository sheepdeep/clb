const mongoose = require('mongoose');

const momoSchema = mongoose.Schema({
    name: String,
    phone: {
        type: String,
        required: true,
        unique: true
    },
    balance: Number,
    password: String,
    limitDay: Number,
    limitMonth: Number,
    accessToken: String,
    number: Number,
    status: String,
}, {
    timestamps: true
})

module.exports = mongoose.model('zalo', momoSchema);
