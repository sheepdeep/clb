const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema({
    phone: String,
    ipAddress: String,
    port: String,
    username: String,
    password: String,
}, {timestamps: true})

module.exports = mongoose.model('proxy', proxySchema);