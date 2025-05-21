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
const transferModel = require('../../models/transfer.model');
const moment = require("moment/moment");
const oldBank = require('../../json/bank.json');
const momoHelper = require("../../helpers/momo.helper");
const momoModel = require('../../models/momo.model');

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
            const histories = await historyModel.find({paid: 'wait'}).lean();

            var startTime = performance.now();

            const dataRewardSuccess = [];
            const dataRewardError = [];

            for (let history of histories) {

                if (history.amount <= 100000) {
                    const checkTrans = await transferModel.findOne({transId: history.transId}).lean();
                    if (checkTrans) {
                        continue;
                    }

                    const user = await userModel.findOne({ username: history.username });
                    if (!user || !user.bankInfo) {
                        await historyModel.findByIdAndUpdate(history._id, {paid: 'bankerror'});
                        continue;
                    }

                    const checkBank = oldBank.data.find(bank => bank.bin === user.bankInfo.bankCode);

                    const dataTransfer = {
                        accountNumber: user.bankInfo.accountNumber,
                        bankCode: checkBank.bin,
                        bankName: checkBank.shortName,
                        amount: history.bonus,
                        comment: 'hoan tien tiktok ' + String(history.transId).slice(-4)
                    };


                    const result = await momoModel.aggregate([
                        { $match: { status: 'active', loginStatus: 'active' } },
                        { $sample: { size: 1 } }
                    ]);


                    let data = await momoHelper.INIT_TOBANK(result[0].phone, dataTransfer);

                    const dataMomo = await momoModel.findOne({phone: result[0].phone}).lean();

                    if (data.success) {
                        const balance = await momoHelper.balance(result[0].phone);
                        dataRewardSuccess.push(dataTransfer);
                        await historyModel.findByIdAndUpdate(history._id, {paid: 'sent', transfer: dataMomo.phone, transferType: 'momo'});
                        await userModel.findOneAndUpdate({username: history.username}, {$set: {"bankInfo.guard": true}});
                        await new transferModel({
                            transId: history.transId,
                            receiver: user.bankInfo.accountNumber,
                            transfer: dataMomo.phone,
                            username: history.username,
                            firstMoney: dataMomo.balance,
                            amount: history.bonus,
                            lastMoney: balance.balance,
                            comment: 'hoan tien tiktok ' + String(history.transId).slice(-4),
                        }).save();
                    } else {
                        await historyModel.findByIdAndUpdate(history._id, {paid: 'hold'});
                        dataRewardError.push(dataTransfer);
                    }
                }

            }

            var endTime = performance.now()

            res.status(200).json({
                success: true,
                message: `Done, ${Math.round((endTime - startTime) / 1000)}s`,
                dataRewardSuccess,
                dataRewardError
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
