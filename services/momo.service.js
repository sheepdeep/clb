const moment = require('moment');
const momoModel = require('../models/momo.model');
const historyModel = require('../models/history.model');
const historyService = require('../services/history.service');

const momoService = {
    getPhone: async (filter, limit = 5) => {
        let list = [];
        let threads = [];
        let phones = await momoModel.find(filter, { _id: 0, name: 1, phone: 1, bonus: 1, limitDay: 1, limitMonth: 1, number: 1, betMin: 1, betMax: 1, status: 1 }).limit(limit).sort({ betMin: 'asc' }).lean();

        phones.map(obj => threads.push(historyService.moneyCount(obj.phone)));

        let data = await Promise.all(threads);

        for (let momo of data) {
            list.push({
                ...momo,
                ...phones.find(obj => obj.phone == momo.phone)
            })
        }

        return list;
    },
    phoneRun: async (limit = 5) => await momoModel.find({ status: 'active', loginStatus: 'active' }).limit(limit).sort({ betMin: 'asc' }),
    limitBet: async (phone, amount) => {
        try {
            let dataPhone = await momoModel.findOne({ phone });

            console.log(`${phone}: ${amount} > ${dataPhone.betMax}: ${amount > dataPhone.betMax} hoặc ${amount} < ${dataPhone.betMin}: ${amount < dataPhone.betMin}`)

            return amount > dataPhone.betMax || amount < dataPhone.betMin;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    limitCheck: async (phone, amount) => {
        try {
            const dataPhone = await momoModel.findOne({ phone });

            if (!dataPhone) {
                return -1;
            }

            let { limitDay, limitMonth, number } = dataPhone;
            let checkCount = await historyService.moneyCount(phone);
            let result = (checkCount.amountDay + Number(amount) > limitDay || checkCount.amountMonth + Number(amount) > limitMonth || checkCount.count + 2 > number);

            console.log(`${phone}: ${checkCount.amountDay + amount}/${limitDay} | ${checkCount.amountMonth + amount}/${limitMonth} | ${checkCount.count + 1}/${number}`);

            result && await momoModel.findOneAndUpdate({ phone }, { $set: { status: 'limit' } });

            return result ? 1 : 0;
        } catch (err) {
            return console.log(err), 0;
        }
    },
    phoneActive: async (oldType, amount, phone) => {
        try {
            if (oldType == 'checkPhone') {
                let dataPhone = await momoModel.findOne({ phone, status: 'active', loginStatus: 'active' });

                if (!phone || !dataPhone || await momoService.limitCheck(dataPhone.phone, amount) == 0) {
                    return;
                }

                return dataPhone.phone;
            }

            if (oldType == 'limit') {
                let dataPhone = await momoModel.findOne({ status: 'active', loginStatus: 'active' });

                if (!dataPhone) {
                    return;
                }

                return await momoService.limitCheck(dataPhone.phone, amount) == 0 ? dataPhone.phone : await momoService.phoneActive(oldType, amount);
            }

            if (oldType == 'money') {
                let dataPhone = await momoModel.aggregate([
                    {
                        $match: {
                            status: 'active',
                            loginStatus: 'active',
                            amount: { $gte: amount }
                        }
                    },
                    {
                        $sample: { size: 1 }
                    }
                ]);

                if (!dataPhone.length) {
                    return;
                }

                return dataPhone[0].phone;
            }

            if (oldType == 'all') {
                let dataPhone = await momoModel.aggregate([
                    {
                        $match: {
                            status: 'active',
                            loginStatus: 'active',
                            amount: { $gte: amount }
                        }
                    },
                    {
                        $sample: { size: 1 }
                    }
                ]);

                if (!dataPhone.length) {
                    return;
                }

                return await momoService.limitCheck(dataPhone[0].phone, amount) == 0 ? dataPhone[0].phone : await momoService.phoneActive(oldType, amount);
            }
        } catch (err) {
            console.log(err);
            return;
        }
    },
    dataInfo: async (dataPhone, all) => {
        try {
            let { amountDay, amountMonth } = await historyService.moneyCount(dataPhone.phone);
            let [receiptDay, receiptMonth] = await Promise.all([historyModel.aggregate([{ $match: { accountNumber: dataPhone.accountNumber, io: 1, timeTLS: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]), historyModel.aggregate([{ $match: { phone: dataPhone.phone, io: 1, timeTLS: { $gte: moment().startOf('month').toDate(), $lt: moment().endOf('month').toDate() } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }])]);

            !all && (dataPhone = {
                phone: dataPhone.phone,
                name: dataPhone.name,
            });

            return ({
                ...dataPhone,
                amountDay,
                amountMonth,
                receiptDay: !receiptDay.length ? 0 : receiptDay[0].amount,
                receiptMonth: !receiptMonth.length ? 0 : receiptMonth[0].amount
            })
        } catch (err) {
            console.log(err);
            return ({
                ...dataPhone,
                amountDay: 0,
                amountMonth: 0,
                receiptDay: 0,
                receiptMonth: 0
            })
        }
    }
}

module.exports = momoService;
