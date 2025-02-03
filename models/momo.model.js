const mongoose = require('mongoose');

const momoSchema = mongoose.Schema({
    name: String,
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: String,
    passwordBusiness: String,
    amount: {
        type: Number,
        default: 0
    },
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
    betMin: {
        type: Number,
        default: 5000
    },
    betMax: {
        type: Number,
        default: 500000
    },
    rkey: String,
    imei: String,
    SECUREID: String,
    TOKEN: String,
    agentId: String,
    dataDevice: Object,
    setupKey: String,
    phash: String,
    ohash: String,
    description: String,
    accessToken: String,
    accessTokenBusiness: String,
    refreshToken: String,
    sessionKey: String,
    publicKey: String,
    REQUEST_ENCRYPT_KEY: String,
    momoSessionKeyTracking: String,
    userAgent: String,
    loginAt: Date,
    storeId: String,
    storeKey: String,
    partnerCode: String,
    accessKey: String,
    secretKey: String,
    balance: Number,
    transfer: {
        type: Boolean,
        default: false
    },
    receiver: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'active'
    },
    errorLogin: Number,
    loginStatus: String,
    merchantId: String,
    brandName: String,
    qrCode: String,
    typeBusiness: String,
    businessForms: Object,
    baseQr: String,
}, {
    timestamps: true
})

module.exports = mongoose.model('momo', momoSchema);