const mongoose = require('mongoose');

const bankSchema = mongoose.Schema({
    jobName: String,
    cronPattern: String,
    jobLink: String,
    jobData: Object,
    lastRun: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, {
    timestamps: true
})

module.exports = mongoose.model('cron', bankSchema);
