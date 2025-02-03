"use strict";
const moment = require("moment");
const utils = require('../helpers/utils.helper');
const historyModel = require('../models/history.model');
const momoModel = require('../models/bank.model');
const settingModel = require('../models/setting.model');
const transferModel = require('../models/transfer.model');
const blockModel = require('../models/block.model');
const missionModel = require("../models/mission.model");
const refundModel = require("../models/refund-bill.model");
const logHelper = require('../helpers/log.helper');
const momoHelper = require('../helpers/momo.helper');
const gameHelper = require('../helpers/game.helper');
const jackpotHelper = require('../helpers/jackpot.helper');
const commentHelper = require('../helpers/comment.helper');
const gameService = require('../services/game.service');
const historyService = require('../services/history.service');
const momoService = require('../services/momo.service');
const jackpotService = require('../services/jackpot.service');
const telegramHelper = require('../helpers/telegram.helper');
const rewardModel = require('../models/reward.model');
const {setting} = require("../controllers/install.controller");
const nemberModel = require('../models/member.model');
const userModel = require("../models/user.model");
const securityHelper = require("./security.helper");

exports.getHistory = async (phone, configHistory) => {
    try {
        let list = [];
        let dataHistory = await momoHelper.getHistoryBusiness(phone);

        if (!dataHistory || !dataHistory.success) {
            return ({
                phone,
                message: dataHistory.message
            })
        }

        list.push(...dataHistory.history);

        let detailThread = list.map((history) => this.handleTransId(history));

        let data = await Promise.all(detailThread);

        return ({
            phone,
            count: data.length,
            history: data
        })
    } catch (err) {
        console.log(err);
        await logHelper.create('getHistory', `Lấy lịch sử thất bại!\n* [ ${phone} ]\n* [ ${err.message || err} ]`);

        return ({
            phone,
            message: 'Có lỗi xảy ra ' + err.message || err
        });
    }
}

exports.escapeRegex = async (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Thoát ký tự đặc biệt
}

exports.handleTransId = async (transId) => {
    try {

        const dataSetting = await settingModel.findOne();
        const history = await historyModel.findOne({transId});

        if (await blockModel.findOne({username: history.username, status: 'active'})) {
            await historyModel.findOneAndUpdate({transId}, {$set: {result: 'block'}});
            console.log(`${history.username} đã bị chặn, bỏ qua!`);
            return;
        }

        let {
            gameName,
            bonus,
            result,
            win,
            paid
        } = await gameHelper.checkWin(history.receiver, history.amount, history.transId, history.comment);

        if (await historyModel.findOne({
            transId: history.transId,
            $and: [
                {
                    $or: [
                        {result: "win"},
                        {result: "lose"},
                        {result: "notUser"}
                    ]
                }
            ]
        })) {
            console.log('Mã giao dịch này đang xử lý hoặc đã xử lý, bỏ qua! #' + history.transId);
            return;
        }

        let commentData = [
            {
                name: 'transId',
                value: history.transId,
            },
            {
                name: 'comment',
                value: history.comment,
            },
            {
                name: 'amount',
                value: history.amount,
            },

        ];
        let rewardComment = await commentHelper.dataComment(dataSetting.commentSite.rewardGD, commentData);
        let user = await userModel.findOne({username: history.username}).lean();

        await historyModel.findOneAndUpdate({transId: history.transId}, {
                $set: {
                    bonus: Math.floor(history.amount * bonus),
                    paid,
                    result,
                }
            }
        )

        if (win) {
            // Gui thong tin chuyen tien
            let textMessage = `Mã giao dịch: <code>${history.transId}</code> \nNội dung: <code>${history.comment}</code> \nTrò chơi: <code>${gameName}</code> \nCược: <code>${history.amount}</code> \nNhận: <code>${Math.round(history.amount * bonus)}</code> \nThông tin nhận: <code>${user && user.bankInfo ? user.bankInfo.accountNumber : ''}</code> --- <code>${user && user.bankInfo ? user.bankInfo.bankCode : ''}</code> \nNội dung CK: <code>${rewardComment}</code>`;

            const buttons = [
                [
                    {
                        text: "✅ Đã trả ✅",  // Văn bản trên button
                        callback_data: `done_${history.transId}`
                    },
                    {
                        text: "🔄 Chuyển người 🔄",  // Văn bản trên button
                        callback_data: `change_${history.transId}`
                    },
                    {
                        text: "🔓 Mã OTP 🔓",  // Văn bản trên button
                        callback_data: `otp_${history.transId}`,
                    }
                ]
            ];

            telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textMessage, 'HTML', buttons)
        }

        let histories = await historyModel.find({username: user.username}, {
            _id: 0,
            transId: 1,
            amount: 1,
            comment: 1,
            gameType: 1,
            result: 1,
            paid: 1,
            description: 1,
            createdAt: 1
        }).sort({createdAt: -1}).limit(10).lean();

        let historys = await historyModel.find({result: 'win'}).sort({createdAt: 'desc'}).limit(5);
        let list = [];

        for (const histor of historys) {
            list.push({
                username: `${histor.username.slice(0, 4)}****`,
                amount: histor.amount,
                bonus: histor.bonus,
                gameName: histor.gameName,
                comment: histor.comment,
                result: histor.result,
                time: moment(histor.timeTLS).format('YYYY-MM-DD HH:mm:ss')
            })
        }

        let dataPost = {
            success: true,
            username: user.username,
            histories,
            allHistories: list
        };

        let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

        socket.emit('cltx', dataEncode);

        return {
            success: true,
            transId,
            message: 'Thao tác #' + transId + ' thành công!'
        }

    } catch (err) {
        console.log(err);
        await logHelper.create('handleTransId', `Xử lý giao dịch thất bại!\n* [ ${transId} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
        return;
    }
}
