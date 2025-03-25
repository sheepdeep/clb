const historyModel = require('../models/history.model');
const userModel = require('../models/user.model');
const res = require("express/lib/response");

const luckygiftController = {
    index: async (req, res, next) => {

    },
    getGift: async (req, res) => {
        try {
            // Nếu lịch sử chưa có phần quà may mắn
            const checkLuckyGift = await historyModel.findOne({gameType: 'LUCKYGIFT', result: 'wait'});

            let countPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: {$exists: true, $ne: null},
                    $and: [{$or: [{result: 'win'}, {result: 'lose'}]}],
                    amount: { $gte: dataSetting.luckyGift.amount },
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);

            if (!checkLuckyGift) {
                await module.exports.createGift();
            }


        } catch (e) {
            console.log(e);
        }
    },
    createGift: async () => {
        // RANDOM ti le
        const amount = parseInt(String(Math.floor(Math.random() * (100 - 10 + 1)) + 10) + '000');
        const ratio = parseInt(String(Math.floor(Math.random() * (3 - 1 + 1)) + 1) + '0');

        console.log(`${amount} - ${ratio}`);

    }
}

module.exports = luckygiftController;