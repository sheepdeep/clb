const historyModel = require("../models/history.model");
const gameModel = require("../models/game.model");
const settingModel = require('../models/setting.model');
const userModel = require("../models/user.model");
const xsstModel = require("../models/xsst.model");

const xssieutocController = {
    index: async (req, res, next) => {
        try {
            userHistories = []
            if (res.locals.profile) {
                userHistories = await historyModel.find({username: res.locals.profile.username}, {_id: 0, transId: 1, amount: 1, comment: 1, gameType: 1, result: 1, paid: 1, description: 1, createdAt: 1}).sort({ createdAt: -1 }).limit(10).lean();
            }
            let games = await gameModel.find({ display: 'show' }).lean();
            res.render('pages/xssieutoc', {games, userHistories});
        } catch (e) {
            next(e);
        }
    },
    bet: async (req, res, next) => {
        try {

            const dataSetting = await settingModel.findOne({});
            const xsst = await xsstModel.findOne({status: 'running'});

            let {amount, gameType, number} = req.body;

            if (!amount || !gameType || !number.length) {
                return res.json({
                    success: false,
                    message: 'Vui lòng chọn đầy đủ thông tin!'
                })
            }

            if (!amount || amount < dataSetting.xsst.betMin) {
                return res.json({
                    success: false,
                    message: `Số tiền không hợp lệ. Số tiền cược tối thiểu là <span class="code-num">${Intl.NumberFormat('en-US').format(dataSetting.xsst.betMin)}</span> và tối đa không vượt quá <span class="code-num">Số Dư Phòng</span>.`
                })
            }

            const user = await userModel.findOne({username: res.locals.profile.username});

            if (amount > user.balance) {
                return res.json({
                    success: false,
                    message: 'Số dư của bạn không đủ. Vui lòng <a href="/sbcoin" target="_blank">NẠP THÊM</a> để tiếp tục chơi.'
                })
            }

            amount = amount * number.length;

            let balance = user.balance - amount;

            let newHistory = await new historyModel({
                username: user.username,
                receiver: 'system',
                transfer: `balance_${user.username}`,
                transId: `XSST${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`,
                amount,
                bonus: 0,
                comment: number.join(" - "),
                gameName: 'XSST',
                gameType: `${gameType.toUpperCase()}_${xsst.turn}`,
                description: `Bạn đã đặt cược <span class="code-num">${Intl.NumberFormat('en-US').format(amount)}</span> vnđ tại <span class="code-num">XSST. <code>${number.join('</code> <code>')}</code> </span>. (SB: ${Intl.NumberFormat('en-US').format(user.balance)} -&gt; ${Intl.NumberFormat('en-US').format(balance)})`,
                result: 'wait',
                paid: 'wait',
            }).save();

            user.balance = balance;
            await user.save();

            return res.json({
                success: true,
                message: `Bạn đã đặt cược <span class="code-num">${Intl.NumberFormat('en-US').format(amount)}</span> vnđ <span class="code-num">THÀNH CÔNG</span>. Kết quả sẽ có trong giây lát. Chúc bạn may mắn!`,
                balance,
            })

        } catch (e) {
            next(e);
        }
    }
}

module.exports = xssieutocController;