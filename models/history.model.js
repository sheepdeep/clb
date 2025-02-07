const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    username: String,
    receiver: String,
    transfer: String,
    transId: String,
    amount: Number,
    bonus: Number,
    comment: String,
    gameName: String,
    gameType: String,
    description: String,
    fullComment: String,
    action: Array, // username, createdAt
    result: {
        type: String,
        default: 'lose'
    },
    paid: {
        type: String,
        default: 'sent'
    },
    find: Boolean,
    isCheck: Boolean,
    timeTLS: Date,
    bot: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
})

historySchema.index({
    transId: 1,
    username: 1
}, {
    unique: true
});

module.exports = mongoose.model('history', historySchema);