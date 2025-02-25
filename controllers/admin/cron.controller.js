const historyHelper = require('../../helpers/history.helper');
const userModel = require('../../models/user.model');
const utils = require('../../helpers/utils.helper');
const taixiuService = require('../../services/taixiu.service')
const bankModel = require('../../models/bank.model');
const settingModel = require("../../models/setting.model");
const mbbankHelper = require("../../helpers/mbbank.helper");
const historyModel = require("../../models/history.model");
const gameService = require("../../services/game.service");
const bankService = require("../../services/bank.service");
const historyService = require("../../services/history.service");
const securityHelper = require("../../helpers/security.helper");
const rewardModel = require('../../models/reward.model');
const blockModel = require("../../models/block.model");
const gameHelper = require("../../helpers/game.helper");
const commentHelper = require("../../helpers/comment.helper");
const telegramHelper = require("../../helpers/telegram.helper");
const moment = require("moment/moment");

const cronController = {
    history: async (req, res, next) => {
        try {
            let check;
            const bank = await bankModel.findOne({status: 'active', loginStatus: 'active'}).lean();
            const dataSetting = await settingModel.findOne({});

            if (bank.bankType === 'mbb') {

                console.log(`Thực hiện kiểm tra lịch sử tài khoản mbb ${bank.accountNumber}`);
                var startTime = performance.now();

                const histories = await mbbankHelper.history(bank.accountNumber, bank.bankType);

                check = await mbbankHelper.handleTransId(histories, bank);

            }

            var endTime = performance.now()

            res.status(200).json({
                success: true,
                message: `Done ${bank.accountNumber} wait ${check}, ${Math.round((endTime - startTime) / 1000)}s`,
            })
        } catch (e) {
            console.log(e);
        }
    },
    reward: async (req, res, next) => {
        try {
            const dataSetting = await settingModel.findOne({});
            const histories = await historyModel.find({result: 'wait'}).lean();

            var startTime = performance.now();
            for (let history of histories) {


                if (await blockModel.findOne({username: history.username, status: 'active'})) {
                    await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {status: 'userBlock'}});
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
                    continue;
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
                    }
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

                let dataPost = {
                    success: true,
                    username: user.username,
                    histories
                };

                let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

                socket.emit('cltx', dataEncode);
            }

            var endTime = performance.now()

            res.status(200).json({
                success: true,
                message: `Done, ${Math.round((endTime - startTime) / 1000)}s`,
            })

        } catch (e) {
            console.log(e);
        }
    },
    fakeBill: async (req, res, next) => {
        try {

            const dataSetting = await settingModel.findOne({});

            if (!dataSetting.fakeUser.data.length) {
                return res.json({
                    success: false,
                    message: 'Không có thành viên!'
                });
            }

            const transId = 'FT25038' + Math.floor(Math.random() * (999999999 - 100000000 + 1));
            const amount = parseInt(String(Math.floor(Math.random() * (100 - 10 + 1)) + 10) + '000');
            const bank = await bankModel.findOne({status: 'active', loginStatus: 'active'}).lean();

            const randomIndex = Math.floor(Math.random() * dataSetting.fakeUser.data.length);

            const randomReward = await rewardModel.aggregate([{ $sample: { size: 1 } }]);
            const reward = randomReward[0];

            let {
                gameName,
                gameType,
                bonus,
                result,
                win,
                paid
            } = await gameHelper.checkWin(bank.accountNumber, amount, transId, reward.content);


            await historyModel.findOneAndUpdate({transId}, {
                $set: {
                    transId,
                    username: dataSetting.fakeUser.data[randomIndex],
                    receiver: bank.accountNumber,
                    bonus: Math.floor(amount * reward.amount),
                    gameName,
                    gameType,
                    amount,
                    result: result,
                    paid: 'sent',
                    isCheck: false,
                    comment: reward.content,
                    timeTLS: new Date(),
                    bot: true
                }
            }, {upsert: true}).lean();

            let histories = await historyModel.find({username: dataSetting.fakeUser.data[randomIndex]}, {
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
                    gameName: histor.gameType,
                    comment: histor.comment,
                    result: histor.result,
                    time: moment(histor.timeTLS).format('YYYY-MM-DD HH:mm:ss')
                })
            }

            let dataPost = {
                success: true,
                username: dataSetting.fakeUser.data[randomIndex],
                histories,
                allHistories: list
            };

            let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

            socket.emit('cltx', dataEncode);

            return res.status(200).json({
                success: true,
                message: `Done ${transId}`,
            })

        } catch (e) {
            next(e);
        }
    }
}

module.exports = cronController;