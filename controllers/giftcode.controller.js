const giftModel = require("../models/gift.model");
const historyModel = require("../models/history.model");
const moment = require("moment/moment");
const blockModel = require("../models/block.model");
const userModel = require('../models/user.model');
const gameModel = require("../models/game.model");
const telegramHelper = require("../helpers/telegram.helper");
const bankModel = require("../models/bank.model");
const settingModel = require("../models/setting.model");
const historyHelper = require('../helpers/history.helper');

const giftcodeController = {
    index: async (req, res, next) => {
        try {
            let games = await gameModel.find({ display: 'show' }).lean();

            res.render('pages/giftcode', {games});
        } catch (e) {
            next(e);
        }
    },
    check: async (req, res, next) => {
        try {

            let {code} = req.body;
            const dataSetting = await settingModel.findOne({});

            if (!code) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập mã quà tặng!',
                })
            }

            if (res.locals.settings.giftCode.status != 'active') {
                return res.json({
                    success: false,
                    message: 'Mã quà tặng tạm bảo trì!',
                })
            }

            if (res.locals.profile.telegram?.status != 'active') {
                return res.json({
                    success: false,
                    message: 'Vui lòng liên kết tài khoản telegram!',
                })
            }

            if (req.session.giftCode == code) {
                return res.json({
                    success: false,
                    message: "Hệ thống đang xử lý, vui lòng thử lại sau ít phút!"
                })
            }

            let checkCode = await giftModel.findOne({code, status: 'active'});

            if (!checkCode) {
                return res.json({
                    success: false,
                    message: 'Mã code đã hết hạn hoặc không hợp lệ!'
                })
            }

            if (checkCode.players.find(e => e.username = res.locals.profile.username)) {
                return res.json({
                    success: false,
                    message: "Mã code đã được sử dụng!"
                });
            }

            if (checkCode.playCount && !await historyModel.findOne({
                username: res.locals.profile.username,
                timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()},
                $and: [{$or: [{result: 'win'}, {result: 'lose'}]}]
            })) {
                return res.json({
                    success: false,
                    message: 'Vui lòng chơi ít nhất 1 game để sử dụng!'
                })
            }

            if (checkCode.players.length >= checkCode.limit) {
                await giftModel.findOneAndUpdate({code}, {$set: {status: 'limit'}});
                return res.json({
                    success: false,
                    message: 'Mã code đã hết lượt sử dụng!'
                })
            }

            let countGift = await historyModel.aggregate([{ $match: { username: res.locals.profile.username, gameName: 'GIFTCODE', bot: false, createdAt: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()} } }, { $group: { _id: null, count: { $sum: 1 } } }]);

            if (countGift.length > 0 && countGift[0].count >= 3) {
                return res.json({
                    success: false,
                    message: 'Bạn chỉ được nhập giới hạn 3 mã code!'
                })
            }

            let countPlay = await historyModel.aggregate([{
                $match: {
                    username: res.locals.profile.username,
                    gameType: {$exists: true, $ne: null},
                    timeTLS: {$gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate()}
                }
            }, {$group: {_id: null, amount: {$sum: '$amount'}}}]);

            countPlay = !countPlay.length ? 0 : countPlay[0].amount;

            if (checkCode.playCount && checkCode.playCount > countPlay) {
                return res.json({
                    success: false,
                    message: `Bạn phải chơi đủ ${Intl.NumberFormat('en-US').format(checkCode.playCount)}đ thì mới đủ điều kiện sử dụng!`
                })
            }

            const timeRemaining = moment(checkCode.expiredAt).diff(moment(), 'seconds');

            if (timeRemaining < 1) {
                await giftModel.findOneAndUpdate({ code }, { $set: { status: "expired" } });
                return res.json({
                    success: false,
                    message: "Mã code đã hết hạn sử dụng!"
                });
            }

            if (await blockModel.findOne({username: res.locals.profile.username})) {
                return res.json({
                    success: false,
                    message: 'Bạn không có quyền sử dụng!'
                })
            }

            req.session.giftCode = code;
            setTimeout(() => req.session.destroy(), 120 * 1000);
            checkCode.players.push({
                username: res.locals.profile.username,
                amount: checkCode.amount,
                time: moment().toDate()
            });

            await checkCode.save();

            if (checkCode.type == 'balance') {
                await userModel.findOneAndUpdate({username: res.locals.profile.username}, {$set: {
                        balance: parseInt(res.locals.profile.balance ? res.locals.profile.balance : 0) + checkCode.amount
                    }
                })

                let newHistory = await new historyModel({
                    username: res.locals.profile.username,
                    receiver: res.locals.profile.username,
                    transfer: `system`,
                    transId: `SBG${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`,
                    amount: checkCode.amount,
                    bonus: checkCode.amount,
                    comment: "GIFTCODE",
                    gameName: 'GIFTCODE',
                    gameType: 'GIFTCODE',
                    description: `SB COIN: ${Intl.NumberFormat('en-US').format(res.locals.profile.balance)} -&gt; ${Intl.NumberFormat('en-US').format(res.locals.profile.balance + checkCode.amount)}`,
                    result: 'ok',
                    paid: 'sent',
                }).save();
            }

            if (checkCode.type == 'bank') {

                const transId = `SBG${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`;
                let newHistory = await new historyModel({
                    username: res.locals.profile.username,
                    receiver: res.locals.profile.username,
                    transId: transId,
                    amount: checkCode.amount,
                    bonus: checkCode.amount,
                    comment: "GIFTCODE",
                    gameName: 'GIFTCODE',
                    gameType: 'GIFTCODE',
                    // description: `SB COIN: ${Intl.NumberFormat('en-US').format(res.locals.profile.balance)} -&gt; ${Intl.NumberFormat('en-US').format(res.locals.profile.balance + checkCode.amount)}`,
                    result: 'ok',
                    paid: 'wait'
                }).save();


                setImmediate(async () => {
                    await historyHelper.transferMomo(await historyModel.findOne({transId: transId}).lean());
                });
            }

            const message = `<b>🎉 Xin chúc mừng người chơi ${res.locals.profile.username.slice(0, 4)}**** đã nhận thưởng GIFTCODE thành công.</b>\n\n<b>💵 GIFTCODE: <code>${code}</code> có trị giá ${Intl.NumberFormat('en-US').format(checkCode.amount)} VNĐ</b>\n\n<b>Truy cập ${dataSetting.nameSite} để trải nghiệm</b>`;

            await telegramHelper.sendText(dataSetting.telegram.token, dataSetting.telegram.chatId, message, "HTML");

            return res.json({
                success: true,
                message: "Nhận quà thành công!"
            })
        } catch (err) {
            console.log(err);
            req.session.giftCode = null, next(err);
        }
    }
}

module.exports = giftcodeController;
