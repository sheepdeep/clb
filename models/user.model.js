const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    token: String,
    level: String,
    admin: Boolean,
    lastOnline: Date,
    dataOTP: Object,
    ip: String,
    balance: Number,
    telegram: Object,
    bankInfo: {
        accountNumber: String,
        accountName: String,
        bankCode: String,
        guard: Boolean
    },
    fan: Boolean,
    referral: Object,
    permission: {
        editHis: Boolean,
        editComment: Boolean,
        delHis: Boolean,
        useTrans: Boolean,
        exTrans: Boolean,
        delTrans: Boolean,
        addNew: Boolean,
        editPer: Boolean,
        editST: Boolean,
        useCron: Boolean,
        useGift: Boolean,
        useGame: Boolean,
        useCheck: Boolean
    }
}, { timestamps: true })

module.exports = mongoose.model('user', userSchema);
