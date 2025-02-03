const mongoose = require('mongoose');

const bankSchema = mongoose.Schema({
    name: String,
    username: String,
    password: String,
    betMin: Number,
    betMax: Number,
    limitDay: {
        type: Number,
        default: 20000000
    },
    limitMonth: {
        type: Number,
        default: 100000000
    },
    number: {
        type: Number,
        default: 40
    },
    balance: Number,
    proxy: String,
    accountNumber: String,
    bankType: String,
    accessToken: String,
    dataDevice: Object,
    status: String,
    loginStatus: String,
    errorLogin: Number,
}, {
    timestamps: true
})

module.exports = mongoose.model('bank', bankSchema);