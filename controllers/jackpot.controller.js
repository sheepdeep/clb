const gameModel = require("../models/game.model");
const bankModel = require("../models/bank.model");
const apiController = require("./api.controller");
const historyModel = require("../models/history.model");
const settingModel = require("../models/setting.model");
const userModel = require("../models/user.model");
const moment = require("moment");
const {v4: uuidv4} = require("uuid");

const jackpotController = {
    index: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne();
            let games = await gameModel.find({ display: 'show' }).lean();

            let totalCount = 0;
            let totalJackpot = 0;

            // const amountHu = dataSetting.amount;

            if (res.locals.profile) {
                let countPlay = await historyModel.aggregate([{
                    $match: {
                        username: res.locals.profile.username,
                        gameType: {$exists: true, $ne: null},
                        $and: [{$or: [{result: 'win'}, {result: 'lose'}]}],
                        amount: { $gte: dataSetting.luckyCard.amount },
                        timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                    }
                }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

                totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);

                let countJackpot = await historyModel.aggregate([{ $match: { username: res.locals.profile.username, gameName: 'JACKPOT', bot: false, createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()} } }, { $group: { _id: null, count: { $sum: 1 } } }]);

                countJackpot = parseInt(!countJackpot.length ? 0 : countJackpot[0].count);

                totalJackpot = Math.round(totalCount / dataSetting.luckyCard.amount - countJackpot)
            }

            res.render('pages/nohu', {games, totalCount, totalJackpot});
        } catch (e) {
            next(e);
        }
    },
    jackpot: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne().lean();

            if (dataSetting.luckyCard.status === 'close') {
                return res.json({
                    success: false,
                    message: dataSetting.luckyCard.name + ' hiện đang bảo trì'
                })
            }

            let countPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: {$exists: true, $ne: null},
                    amount: { $gte: dataSetting.luckyCard.amount },
                    $and: [{$or: [{result: 'win'}, {result: 'lose'}]}],
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            let totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);

            let countJackpot = await historyModel.aggregate([{ $match: { username: res.locals.profile.username, gameName: 'JACKPOT', createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()} } }, { $group: { _id: null, count: { $sum: 1 } } }]);

            countJackpot = parseInt(!countJackpot.length ? 0 : countJackpot[0].count);

            let totalJackpot = Math.round(totalCount / dataSetting.jackpot.amount - countJackpot)

            if (totalJackpot <= 0) {
                return res.json({
                    success: false,
                    message: `Bạn không đủ luợt để lật thẻ`
                })
            }

            let selectGift;
            const gifts = dataSetting.luckyCard.gift;

            const totalRatio = gifts.reduce((sum, gift) => sum + parseInt(gift.ratio), 0);

            // Tạo một số ngẫu nhiên từ 0 đến totalRatio
            const randomNumber = Math.random() * totalRatio;

            // Duyệt qua danh sách quà tặng và tìm món quà phù hợp
            let cumulativeRatio = 0;
            for (let gift of gifts) {
                cumulativeRatio += gift.ratio;
                if (randomNumber < cumulativeRatio) {
                    selectGift = gift;
                    break;
                }
            }

            const randomBanks = await bankModel.aggregate([
                { $match: { bankType: 'exim', status: 'active' } },
                { $sample: { size: 1 } }
            ]);

            if (selectGift.amount > 0) {
                let newHistory = await new historyModel({
                    username: res.locals.profile.username,
                    receiver: res.locals.profile.username,
                    transId: `SBW${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`,
                    amount: selectGift.amount,
                    bonus: selectGift.amount,
                    comment: "JACKPOT",
                    gameName: 'JACKPOT',
                    gameType: 'JACKPOT',
                    result: 'ok',
                    transfer: randomBanks[0].accountNumber,
                    paid: 'wait',
                }).save();
            }


            // eventHelper.rewardWheel(phone, code, selectGift.amount);

            return res.json({
                success: true,
                message: "Chúc mừng bạn nhận được " + selectGift.name,
                author: "ALOMOMO.me",
                gift: {
                    name: selectGift.name,
                    image: selectGift.img,
                    pos: selectGift.pos
                }
            });
        } catch (e) {
            console.log(e);
        }
    },
}

module.exports = jackpotController;
