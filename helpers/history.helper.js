"use strict";
const moment = require("moment");
const historyModel = require('../models/history.model');
const settingModel = require('../models/setting.model');
const blockModel = require('../models/block.model');
const logHelper = require('../helpers/log.helper');
const gameHelper = require('../helpers/game.helper');
const commentHelper = require('../helpers/comment.helper');
const telegramHelper = require('../helpers/telegram.helper');
const userModel = require("../models/user.model");
const securityHelper = require("./security.helper");
const bankModel = require('../models/bank.model');
const mbbankHelper = require("./mbbank.helper");
const sleep = require("time-sleep");
const gameService = require("../services/game.service");
const rewardModel = require("../models/reward.model");

exports.handleCltx = async (history, bank) => {
    try {
        let {
            creditAmount: amount,
            refNo: transId,
            addDescription: transactionDesc,
            description,
            bankName,
            transactionDate
        } = history;

        amount = parseInt(amount);

        const {username, comment} = await this.handleDesc(transactionDesc);

        let user = await userModel.findOne({username}).lean();

        // Nhận tiền
        if (amount > 0) {

            let {gameName, gameType} = await gameService.checkGame(comment);

            await historyModel.findOneAndUpdate({transId}, {
                $set: {
                    transId,
                    username: user.username,
                    receiver: bank.accountNumber,
                    gameName,
                    gameType,
                    amount,
                    fullComment: description,
                    result: 'wait',
                    isCheck: bankName === 'MB' ? false : true,
                    comment,
                    timeTLS: moment(transactionDate, 'DD/MM/YYYY HH:mm:ss').format()
                }
            }, {upsert: true}).lean();

            await this.handleTransId(transId);

            return true;
        }

    } catch (e) {
        console.log(e);
    }
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
            })

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

exports.handleXsmb = async (history, bank) => {
    try {

        const dataSetting = await settingModel.findOne();
        const today = new Date();  // Lấy thời gian hiện tại

        let {
            creditAmount: amount,
            refNo: transId,
            addDescription: transactionDesc,
            description,
            bankName,
            transactionDate
        } = history;
        amount = parseInt(amount);

        let commentXSMB;

        const {username, comment} = await this.handleDesc(transactionDesc);

        let user = await userModel.findOne({username}).lean();

        if (comment === dataSetting.xsmb.commentLo) {
            commentXSMB = 'LO';
        } else if (comment === dataSetting.xsmb.commentDe) {
            commentXSMB = 'DE';
        } else if (comment === dataSetting.xsmb.commentXien2) {
            commentXSMB = 'XIEN2';
        }

        //TODO: Mã trước 18:00
        const date = moment(transactionDate, 'DD/MM/YYYY HH:mm:ss'); // "2025-02-11 19:56:29"
        const hours = date.hours();
        const minutes = date.minutes();

        console.log(hours)

        const {checkCountNumber, numbers} = await this.handleNumberXsmb(transactionDesc);

        //TODO: không có số đặt cược sử thua
        if (numbers === 0) {
            await historyModel.findOneAndUpdate({transId}, {
                $set: {
                    transId,
                    username: user.username,
                    receiver: bank.accountNumber,
                    gameName: 'XSMB',
                    gameType: `XSMB_${commentXSMB}`,
                    amount,
                    fullComment: description,
                    result: 'lose',
                    paid: 'sent',
                    isCheck: false,
                    comment,
                    timeTLS: new Date()
                }
            }, {upsert: true}).lean();
            return;
        }

        if (hours > 18) {
            await historyModel.findOneAndUpdate({transId}, {
                $set: {
                    transId,
                    username: user.username,
                    receiver: bank.accountNumber,
                    gameName: 'XSMB',
                    gameType: `XSMB_${commentXSMB}`,
                    amount,
                    fullComment: description,
                    result: 'wait',
                    isCheck: false,
                    comment: numbers,
                    timeTLS: moment(transactionDate, 'DD/MM/YYYY HH:mm:ss').format(),
                    timeCheck: new Date(),
                }
            }, {upsert: true}).lean();
            return;

        } else {
            await historyModel.findOneAndUpdate({transId}, {
                $set: {
                    transId,
                    username: user.username,
                    receiver: bank.accountNumber,
                    gameName: 'XSMB',
                    gameType: `XSMB_${commentXSMB}`,
                    amount,
                    fullComment: description,
                    result: 'wait',
                    isCheck: false,
                    comment: numbers,
                    timeTLS: moment(transactionDate, 'DD/MM/YYYY HH:mm:ss').format(),
                    timeCheck: today.getDate() + 1,
                }
            }, {upsert: true}).lean();
            return;
        }


    } catch (e) {
        console.log(e);
    }
}

exports.handleNumberXsmb = async (comment) => {
    try {
        let numbers;
        const number = comment.split(' ')[2];
        let checkCountNumber = 1;

        if (number.includes(' ')) {
            const arrayNumber = number.split(' ');
            checkCountNumber = arrayNumber.length;
            numbers = arrayNumber.join(" - ");
        } else {
            numbers = number;
        }

        return {
            checkCountNumber,
            numbers
        }

    } catch (e) {
        console.log(e);

        return {
            checkCountNumber: 0,
            numbers: 0
        }
    }
}

exports.handleDesc = async (description) => {
    const desc = description.split(' ');

    return {
        username: desc[0],
        comment: desc[1].toUpperCase()
    }
};

exports.history = async () => {
    try {

        const dataSetting = await settingModel.findOne();
        const bankData = await bankModel.findOne({status: 'active', loginStatus: 'active', bankType: 'mbb'}).lean();

        if (bankData) {

            if (dataSetting.checkTransId.status == 'close') {
                await sleep(3 * 1000);
                return await this.history();
            }
    
            console.log(`Thực hiện kiểm tra lịch sử tài khoản mbb ${bankData.accountNumber}`);
            const histories = await mbbankHelper.history(bankData.accountNumber, bankData.bankType);
    
            if (!histories) {
                console.log(`Thực hiện đăng nhập tài khoản mbb ${bankData.accountNumber}`);
                await mbbankHelper.login(bankData.accountNumber, bankData.bankType);
                await sleep(15 * 1000);
                return await this.history();
            }
    
            await mbbankHelper.handleTransId(histories, bankData);
    
            await sleep(3 * 1000);
            return await this.history();
        }

        await sleep(10 * 1000);
        return await this.history();
       

    } catch (e) {
        // Thong bao loi
        logHelper.create('getHistory', e.message || e.msg);
        console.log(e);
    }
};

exports.fakeBill = async () => {
    try {

        const bankData = await bankModel.findOne({status: 'active', loginStatus: 'active', bankType: 'mbb'}).lean();

        const dataSetting = await settingModel.findOne({});

        if (!dataSetting.fakeUser.data.length) {
            await sleep(3000);
            return await this.fakeBill();
        }

        if (dataSetting.checkTransId.status == 'close') {
            await sleep(3000);
            return await this.fakeBill();
        }

        if (bankData) {

            const transId = 'FT25038' + Math.floor(Math.random() * (999999999 - 100000000 + 1));
            const amount = parseInt(String(Math.floor(Math.random() * (1000 - 10 + 1)) + 10) + '000');
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
                allHistories: list
            };

            let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

            socket.emit('cltx', dataEncode);

            await sleep(5 * 1000);
            return await this.fakeBill();
        }

        await sleep(60 * 1000);
        return await this.fakeBill();

    } catch (e) {
        console.log(e);
        await sleep(60 * 1000);
        return await this.fakeBill();
    }
}