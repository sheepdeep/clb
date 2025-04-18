const moment = require('moment');
const historyModel = require('../models/history.model');
const transferModel = require('../models/transfer.model');
const settingModel = require('../models/setting.model');

const historyService = {
    moneyCount: async (accountNumber, month = null) => {
        const date = new Date();
        const dataMonth = await transferModel.aggregate([{ $match: { transfer: accountNumber, createdAt: { $gte: new Date(date.getFullYear(), (month || date.getMonth()), 1), $lt: new Date(date.getFullYear(), (month || date.getMonth()) + 1, 0) } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]);
        const dataDay = await transferModel.aggregate([{ $match: { transfer: accountNumber, createdAt: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]);

        return ({
            accountNumber,
            amountDay: !dataDay.length ? 0 : dataDay[0].amount,
            amountMonth: !dataMonth.length ? 0 : dataMonth[0].amount,
            count: !dataDay.length ? 0 : dataDay[0].count
        });
    },
    moneyCountReceiver: async (phone, month = null) => {
        const date = new Date();
        let [dataDay, dataMonth] = await Promise.all([historyModel.aggregate([{ $match: { receiver: phone, status: { $ne: 'waitTransfer' }, createdAt: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]), historyModel.aggregate([{ $match: { receiver: phone, status: { $ne: 'waitTransfer' }, createdAt: { $gte: moment().startOf('month').toDate(), $lt: moment().endOf('month').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }])]);

        return ({
            phone,
            amountDay: !dataDay.length ? 0 : dataDay[0].amount,
            amountMonth: !dataMonth.length ? 0 : dataMonth[0].amount,
        });
    },
    getTOP: async () => {
        let dataSetting = await settingModel.findOne().lean();
        if (dataSetting.topData.status != 'active') return dataSetting.topData.fakeData;

        let listTOP = [], dataTOP = dataSetting.topData.bonus;
        if (!dataTOP || !dataTOP.length) return;

        let list = await historyModel.aggregate([{ $match: { result: { $in: ['win', 'lose'] }, createdAt: { $gte: moment().startOf(dataSetting.topData.typeTOP).toDate(), $lt: moment().endOf(dataSetting.topData.typeTOP).add(dataSetting.topData.typeTOP == 'week' ? 1 : 0, 'days').toDate() } } }, { $group: { _id: "$username", amount: { $sum: '$amount' } } }, { $sort: { amount: -1 } }, { $limit: dataTOP.length }]);

        for (let [index, data] of list.entries()) {
            const bonus = dataTOP[index] || 0;
            listTOP.push({
                phone: `${data._id.slice(0, 6)}****`,
                amount: data.amount,
                bonus: bonus
            })
        }

        return listTOP;
    },
    getHistory: async () => {
        let historys = await historyModel.find({ status: 'win' }).sort({ createdAt: 'desc' }).limit(10);
        let list = [];

        for (const history of historys) {
            list.push({
                phone: `${history.partnerId.slice(0, 6)}****`,
                amount: history.amount,
                bonus: history.bonus,
                gameName: history.gameName,
                content: history.comment,
                status: 'win',
                time: moment(history.timeTLS).format('YYYY-MM-DD HH:mm:ss')
            })
        }

        return list;
    },
    refundCount: async (receiver, limit) => {
        let data = await historyModel.aggregate([{ $match: { partnerId: receiver, status: 'refund', timeTLS: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } } }, { $group: { _id: null, count: { $sum: 1 } } }]);
        return limit - (data.length ? data[0].count : 0);
    }
}

module.exports = historyService;
