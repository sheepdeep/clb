const moment = require('moment');
const crypto = require('crypto');
const telegramHelper = require('../../helpers/telegram.helper');
const utils = require('../../helpers/utils.helper');
const userModel = require('../../models/user.model');
const bankModel = require("../../models/bank.model");
const historyModel = require("../../models/history.model");
const settingModel = require("../../models/setting.model");

const topController = {
    index: async (req, res, next) => {
        try {
            let dataSetting = await settingModel.findOne().lean();
            const { startTime } = req.query;

            let listTOP = [], dataTOP = dataSetting.topData.bonus;
            let list;
            if (startTime) {
                const [yearStr, weekStr] = startTime.split('-W');
                const year = parseInt(yearStr);
                const week = parseInt(weekStr);

                const startOfWeek = moment().isoWeekYear(year).isoWeek(week).startOf('isoWeek').toDate();
                const endOfWeek = moment().isoWeekYear(year).isoWeek(week).endOf('isoWeek').toDate();

                list = await historyModel.aggregate([{ $match: { result: { $in: ['win', 'lose'] }, createdAt: { $gte: startOfWeek, $lt: endOfWeek } } }, { $group: { _id: "$username", amount: { $sum: '$amount' } } }, { $sort: { amount: -1 } }, { $limit: dataTOP.length }]);

            } else {
                list = await historyModel.aggregate([{ $match: { result: { $in: ['win', 'lose'] }, createdAt: { $gte: moment().startOf('week').toDate(), $lt: moment().endOf('week').add('week').toDate() } } }, { $group: { _id: "$username", amount: { $sum: '$amount' } } }, { $sort: { amount: -1 } }, { $limit: dataTOP.length }]);
            }

            for (let [index, data] of list.entries()) {
                const bonus = dataTOP[index] || 0;
                listTOP.push({
                    username: `${data._id}`,
                    amount: data.amount,
                    bonus: bonus
                })
            }

            res.render('admin/top', {
                title: 'Chuyển Tiền Bank',
                listTOP
            });
        } catch (err) {
            next(err);
        }
    },
    refund: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne();
            let { transId, username, type, otp } = req.body;

            if (!transId || !username || !type) {
                return res.json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin!'
                })
            }

            let check = await userModel.findOne({ username }).lean();

            if (!check && !res.locals.profile.permission.useTrans || check && !res.locals.profile.permission.exTrans && !res.locals.profile.permission.useTrans) {
                return res.json({
                    success: false,
                    message: 'Không có quyền thao tác!'
                })
            }


            if (!check) {
                if (!otp) {
                    return res.json({
                        success: false,
                        message: 'Vui lòng nhập mã OTP!'
                    })
                }

                let verifyOTP = await utils.OTP('verify', {
                    otp: crypto.createHash('md5').update(otp).digest("hex"),
                    username: res.locals.profile.username,
                    action: 'useTrans',
                });

                if (!verifyOTP.success) {
                    return res.json({
                        success: false,
                        message: verifyOTP.message
                    })
                }
            }

            await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `* [ ${res.locals.profile.username} ] hoàn tiền \n* [ ${username} | ${transId} ]`)
            let data = await historyModel.findOne({transId: transId}).lean();

            if (data) {
                let bonus = 0;
                if (type == 'lose') {
                    bonus = Math.floor(data.amount * dataSetting.refund.won / 100);
                } else if (type == 'wrong') {
                    bonus = Math.floor(data.amount * dataSetting.refund.fail / 100);
                }

                const randomBanks = await bankModel.aggregate([
                    { $match: { bankType: 'exim', status: 'active' } },
                    { $sample: { size: 1 } }
                ]);

                const transIdNew = `SBRF${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`;

                await historyModel.findOneAndUpdate({transId: transIdNew}, {
                    $set: {
                        transId: transIdNew,
                        username: check.username,
                        receiver: data.receiver,
                        gameName: data.gameName,
                        gameType: data.gameType,
                        amount: bonus,
                        bonus,
                        result: 'refund',
                        paid: 'wait',
                        comment: data.comment,
                        description: `Hoàn tiền đơn thua ${data.transId}`,
                        transfer: randomBanks[0].accountNumber
                    }
                }, {upsert: true}).lean();

                return res.json({success: true, message: 'Hoàn tiền thành công!'});
            } else {
                return res.json({success: false, message: 'Không thấy lịch sử!'})
            }


        } catch (err) {
            console.log(err);
            next(err);
        }
    },
}

module.exports = topController;
