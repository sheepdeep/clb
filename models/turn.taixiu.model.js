const mongoose = require('mongoose');

const turnTaiXiuSchema = new mongoose.Schema({
    turn: {
        type: String,
        required: true,
        unique: true
    },
    second: Number,
    xucxac1: Number,
    xucxac2: Number,
    xucxac3: Number,
    result: Number,
    resutltText: String,
    userTai: Array,
    userXiu: Array,
    sumTai: Number,
    sumXiu: Number,
    timeStarted: Date,
    timeEnded: Date,
    millisecondsStarted: String,
    millisecondsEnded: String,
    status: String,
}, {
    timestamps: true
})

module.exports = mongoose.model('turnTaiXiu', turnTaiXiuSchema);