const axios = require("axios");
const dotenv = require('dotenv');

// Load biến môi trường
dotenv.config({path: '../configs/config.env'});
const {connectDB} = require('../configs/database');

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
});

const bankModel = require('../models/bank.model');
const gameService = require('./game.service');
const bankService = require('./bank.service');
const historyService = require('./history.service');
const userModel = require('../models/user.model');
const historyModel = require("../models/history.model");
const settingModel = require('../models/setting.model');
const blockModel = require('../models/block.model');
const gameHelper = require('../helpers/game.helper');
const commentHelper = require('../helpers/comment.helper')
const telegramHelper = require('../helpers/telegram.helper');

const rewardTele = async () => {
    try {
        const dataSetting = await settingModel.findOne({});
        const histories = await historyModel.find({status: 'wait'}).lean();

        let status = 'wait';

        for (let history of histories) {

            if (await blockModel.findOne({username: history.username, status: 'active'})) {
                await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {status: 'userBlock'}});
                console.log(`${history.username} đã bị chặn, bỏ qua!`);
                return;
            }

            let {
                gameName,
                gameType,
                status,
                win,
                won,
                bonus
            } = await gameHelper.checkWin(history.receiver, history.amount, history.transId, history.comment);

            if (await historyModel.findOne({
                transId: history.transId,
                $and: [
                    {
                        $or: [
                            {status: "waitReward"},
                            {status: "waitRefund"},
                            {status: "win"},
                            {status: "won"},
                            {status: "refund"},
                            {status: "limitRefund"},
                        ]
                    }
                ]
            })) {
                console.log('Mã giao dịch này đang xử lý hoặc đã xử lý, bỏ qua! #' + transId);
                return;
            }

            // if (dataHistory.status === 'limitBet' || dataHistory.status === 'errorComment' || status === 'errorComment' || status === 'limitBet') {
            // }

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
                {
                    name: 'bonus',
                    value: bonus,
                }

            ];
            let rewardComment = await commentHelper.dataComment(dataSetting.commentSite.rewardGD, commentData);
            let user = await userModel.findOne({username: history.username}).lean();

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
                    }
                ]

            ];

            telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textMessage, 'HTML', buttons)

            return;
        }

    } catch (e) {
        console.log(e);
    }
}

rewardTele();