const moment = require('moment');
const historyModel = require('../models/history.model');
const transferModel = require('../models/transfer.model');
const settingModel = require('../models/setting.model');

const revenueService = {
    revenueBet: async (time, typeDate, username, gameType) => {
        try {
            let filterWin = [{ $match: { result: 'win', bot: false } }, { $group: { _id: null, count: { $sum: 1 } } }]
            let filterWon = [{ $match: { result: 'lose', bot: false } }, { $group: { _id: null, count: { $sum: 1 } } }];
            let filterWait = [{ $match: { bot: false, $and: [{ $or: [{ result: 'wait' }, { result: 'waitReward' }, { result: 'waitRefund' }] }] } }, { $group: { _id: null, count: { $sum: 1 } } }];
            let filterError = [{ $match: { bot: false, $and: [{ $or: [{ result: 'errorMoney' }, { result: 'limitPhone' }, { result: 'limitBet' }, { result: 'errorComment' }, { result: 'errorPhone' }, { result: 'phoneBlock' }, { result: 'notUser'}] }] } }, { $group: { _id: null, count: { $sum: 1 } } }];
            let filterRefund = [{ $match: { bot: false, $and: [{ $or: [{ result: 'refund' }, { result: 'limitRefund' }] }] } }, { $group: { _id: null, count: { $sum: 1 } } }];

            if (username) {
                filterWin[0].$match.username = username;
                filterWon[0].$match.username = username;
                filterWait[0].$match.username = username;
                filterError[0].$match.username = username;
                filterRefund[0].$match.username = username;
            }

            if (gameType) {
                filterWin[0].$match.gameType = gameType;
                filterWon[0].$match.gameType = gameType;
                filterWait[0].$match.gameType = gameType;
                filterError[0].$match.gameType = gameType;
                filterRefund[0].$match.gameType = gameType;
            }

            if (time && typeDate !== 'all') {
                filterWin[0].$match.timeTLS = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
                filterWon[0].$match.timeTLS = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
                filterWait[0].$match.timeTLS = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
                filterError[0].$match.timeTLS = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
                filterRefund[0].$match.timeTLS = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
            }

            let [win, won, wait, error, refund] = await Promise.all([historyModel.aggregate(filterWin), historyModel.aggregate(filterWon), historyModel.aggregate(filterWait), historyModel.aggregate(filterError), historyModel.aggregate(filterRefund)]);

            win = win.length ? win[0].count : 0;
            won = won.length ? won[0].count : 0;
            wait = wait.length ? wait[0].count : 0;
            error = error.length ? error[0].count : 0;
            refund = refund.length ? refund[0].count : 0;

            return ({
                success: true,
                wait,
                win,
                won,
                error,
                refund
            })

        } catch (err) {
            console.log(err);
            return ({
                success: false,
                wait: 0,
                win: 0,
                won: 0,
                error: 0,
                refund: 0
            })
        }
    },
    revenueMoney: async (time, typeDate, username) => {
        try {

            let filterReceipt = [
                {
                    $match: {
                        result: { $in: ['lose', 'win', 'refund'] },
                        bot: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        amount: { $sum: '$amount' }
                    }
                }
            ];            let filterMinus = [{ $match: {}},{ $group: { _id: null, amount: { $sum: '$amount' } } }]

            if (username) {
                filterReceipt[0].$match.username = username;
                filterMinus[0].$match.username = username;
            }

            if (time && typeDate != 'all') {
                filterReceipt[0].$match.createdAt = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
                filterMinus[0].$match.createdAt = { $gte: moment(time).startOf(typeDate).toDate(), $lt: moment(time).endOf(typeDate).toDate() }
            }

            let [receipt, minus] = await Promise.all([historyModel.aggregate(filterReceipt), transferModel.aggregate(filterMinus)]);

            receipt = receipt.length ? receipt[0].amount : 0;
            minus = minus.length ? minus[0].amount : 0;
            let earning = receipt - minus;

            return ({
                success: true,
                receipt,
                minus,
                earning
            })
        } catch (err) {
            console.log(err);
            return ({
                success: false,
                receipt: 0,
                minus: 0,
                earning: 0
            })
        }
    },
}

module.exports = revenueService;
