const gameModel = require("../models/game.model");
const moment = require("moment/moment");
const historyModel = require("../models/history.model")
const settingModel = require("../models/setting.model");
const commentHelper = require("../helpers/comment.helper");
const telegramHelper = require("../helpers/telegram.helper");
const userModel = require("../models/user.model");
const bankModel = require("../models/bank.model");

const missionController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({ display: 'show' }).lean();
            let totalCount = 0;
            let totalCountMission = 0;

            if (res.locals.profile) {
                let countPlay = await historyModel.aggregate([{
                    $match: {
                        username: res.locals.profile.username,
                        gameType: {$exists: true, $ne: null},
                        $and: [{$or: [{result: 'win'}, {result: 'lose'}]}],
                        timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                    }
                }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

                totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);

                let countBonus = await historyModel.aggregate([{
                    $match: {
                        username: res.locals.profile.username,
                        gameType: "MISSION",
                        createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                    }
                }, {$group: {_id: null, bonus: {$sum: '$bonus'}}}]);

                totalCountMission = parseInt(!countBonus.length ? 0 : countBonus[0].bonus);
            }

            res.render('pages/mission', {games, totalCount, totalCountMission});
        } catch (e) {
            next(e);
        }
    },
    accept: async (req, res, next) => {
        try {
            const {id} = req.body;
            const dataSetting = await settingModel.findOne();

            if (!res.locals.profile.username) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để thực hiện!'
                })
            }

            let dataMission = dataSetting.missionData.data[id];

            const checkAccept = await historyModel.findOne({
                username: res.locals.profile.username, // Lọc theo username
                gameType: 'MISSION',                  // Lọc theo loại game
                bonus: dataMission.bonus,             // Lọc theo bonus
                createdAt: {
                    $gte: moment().startOf('day').toDate(), // Thời gian bắt đầu ngày
                    $lt: moment().endOf('day').toDate()     // Thời gian kết thúc ngày
                }
            });

            if (checkAccept) {
                return res.json({
                    success: false,
                    message: 'Bạn đã nhận thưởng nhiệm vụ ngày!'
                })
            }

            let countPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: {$exists: true, $ne: null},
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            const totalCount = parseInt(!countPlay.length ? 0 : countPlay[0].amount);
            let transId = `MISSION${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`

            if (totalCount >= dataMission.amount) {
                let user = await userModel.findOne({username: res.locals.profile.username}).lean();

                let newHistory = await new historyModel({
                    username: user.username,
                    receiver: user.username,
                    transId,
                    comment: 'MISSION',
                    amount: totalCount,
                    bonus: dataMission.bonus,
                    gameName: 'MISSION',
                    gameType: 'MISSION',
                    result: 'ok',
                    paid: 'wait',
                    // transfer: randomBanks[0].accountNumber,
                }).save();
            }

            return res.json({
                success: true,
                message: 'Hệ thống đang gửi quà về cho bạn!'
            })

        } catch (e) {
            next(e);
        }
    }
}

module.exports = missionController;
