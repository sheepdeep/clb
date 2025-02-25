const mongoose = require('mongoose');

const xsstSchema = new mongoose.Schema({
    turn: {
        type: String,
        required: true,
        unique: true
    },
    second: Number,
    result: {
        gdb: String,
        g1: String,
        g2: Object,
        g3: Object,
        g4: Object,
        g5: Object,
        g6: Object,
        g7: Object,
    },
    timeStarted: Date,
    timeEnded: Date,
    millisecondsStarted: String,
    millisecondsEnded: String,
    status: String,
}, {
    timestamps: true
})

module.exports = mongoose.model('xsst', xsstSchema);