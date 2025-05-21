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
    status: {
        type: String,
        default: 'active'
    },
    errorLogin: Number,
    riskId: String,
    riskErrorCode: String,
    riskOptionKey: String,
    rkeyOTP: String,
    aToken: String,
    reward: Boolean,
    loginStatus: String,
    merchantId: String,
    brandName: String,
    qrCode: String,
    typeBusiness: String,
    businessForms: Object,
    baseQr: String,
    lastLogined: Date
}, {
    timestamps: true
})

module.exports = mongoose.model('momo', momoSchema);
