const gameModel = require("../models/game.model");
const bankModel = require("../models/bank.model");
const settingModel = require("../models/setting.model");
const historyModel = require("../models/history.model");

const taixiuController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({display: 'show'}).lean();

            res.render('pages/phongtx', {games});
        } catch (e) {
            next(e);
        }
    },
    bet: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne({});
            const {amount, type}  = req.body;

            if (amount < 0) {
                return res.json({
                    success: false,
                    message: "Số tiền không hợp lệ!"
                })
            }

            if (type != 'SRT' || type != 'SRX') {
                return res.json({
                    success: false,
                    message: 'Vui lòng chọn tài hoặc xỉu!'
                })
            }

            if (amount < res.locals.profile.balance) {
                return res.json({
                    success: false,
                    message: "Số dư không đủ để thực hiện đặt cược!"
                })
            }

            if (!res.locals.profile) {
                return res.json({
                    success: false,
                    message: "Vui lòng đăng nhập tài khoản!"
                })
            }
            const turn = await turnTaiXiuModel.findOne({status: 'running'}).lean();
            const user = await userModel.findOne({username: res.locals.profile.username});
            const checkHistory = await historyModel.findOne({username: user.username});

            if (checkHistory && checkHistory.comment != type) {
                return res.json({
                    success: false,
                    message: "Bạn không thể đặt 2 cửa cùng lúc!"
                })
            }

        } catch (e) {

        }
    }
}

module.exports = taixiuController;