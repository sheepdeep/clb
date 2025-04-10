const gameModel = require("../models/game.model");
const bankModel = require("../models/bank.model");
const apiController = require("./api.controller");
const historyModel = require("../models/history.model");
const settingModel = require("../models/setting.model");
const userModel = require("../models/user.model");
const moment = require("moment");
const {v4: uuidv4} = require("uuid");

const wheelController = {
    index: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne();
            let games = await gameModel.find({ display: 'show' }).lean();
            let bank = await bankModel.findOne({status: 'active', loginStatus: 'active',}, {
                _id: 0,
                bankType: 1,
                accountNumber: 1,
                name: 1,
                bonus: 1,
                number: 1,
                betMin: 1,
                betMax: 1,
                status: 1
            }).lean();

            let totalCount = 0;
            let totalWheel = 0;

            if (res.locals.profile) {
                let countPlay = await historyModel.aggregate([{
                    $match: {
                        username: res.locals.profile.username,
                        gameType: {
                            $exists: true,
                            $ne: null,
                            $in: ["CL_Game", "TX_Game"]
                        },
                        amount: { $gte: dataSetting.wheel.amount },
                        
                        $and: [{$or: [{result: 'win'}, {result: 'lose'}]}],
                        timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                    }
                }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

                totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);

                let countWheel = await historyModel.aggregate([{ $match: { username: res.locals.profile.username, gameName: 'WHEEL', bot: false, createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()} } }, { $group: { _id: null, count: { $sum: 1 } } }]);

                countWheel = parseInt(!countWheel.length ? 0 : countWheel[0].count);

                totalWheel = Math.round(totalCount / dataSetting.wheel.amount - countWheel)
            }

            res.render('pages/wheel', {games, totalCount, totalWheel});
        } catch (e) {
            next(e);
        }
    },
    wheel: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne().lean();

            if (dataSetting.wheel.status === 'close') {
                return res.json({
                    success: false,
                    message: dataSetting.wheel.name + ' hiện đang bảo trì'
                })
            }

            let countPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: {
                        $exists: true,
                        $ne: null,
                        $in: ["CL_Game", "TX_Game"]
                    },
                    amount: { $gte: dataSetting.wheel.amount },
                    
                    $and: [{$or: [{result: 'win'}, {result: 'lose'}]}],
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            let totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);

            let countWheel = await historyModel.aggregate([{ $match: { username: res.locals.profile.username, gameName: 'WHEEL', bot: false, createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()} } }, { $group: { _id: null, count: { $sum: 1 } } }]);

            countWheel = parseInt(!countWheel.length ? 0 : countWheel[0].count);


            let totalWheel = Math.round(totalCount / dataSetting.wheel.amount - countWheel)

            if (totalWheel <= 0) {
                return res.json({
                    success: false,
                    message: `Bạn không đủ luợt để quay`
                })
            }

            let selectGift;
            const gifts = dataSetting.wheel.gift;

            const totalRatio = gifts.reduce((sum, gift) => sum + parseInt(gift.ratio), 0);

            // Tạo một số ngẫu nhiên từ 0 đến totalRatio
            const randomNumber = Math.random() * totalRatio;

            // Duyệt qua danh sách quà tặng và tìm món quà phù hợp
            let cumulativeRatio = 0;
            for (let gift of gifts) {
                cumulativeRatio += gift.ratio;
                if (randomNumber < cumulativeRatio) {
                    selectGift = gift;  // Chọn món quà này
                    break;
                }
            }

            let newHistory = await new historyModel({
                username: res.locals.profile.username,
                receiver: res.locals.profile.username,
                transId: `SBW${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`,
                amount: selectGift.amount,
                bonus: selectGift.amount,
                comment: "WHEEL",
                gameName: 'WHEEL',
                gameType: 'WHEEL',
                result: 'ok',
                paid: 'wait',
            }).save();

            // eventHelper.rewardWheel(phone, code, selectGift.amount);

            return res.json({
                success: true,
                message: "Chúc mừng bạn nhận được " + selectGift.name,
                author: "ALOMOMO.me",
                gift: {
                    name: selectGift.name,
                    pos: selectGift.pos
                }
            });
        } catch (e) {
            console.log(e);
        }
    },
}

module.exports = wheelController;