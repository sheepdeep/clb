const axios = require("axios");
const dotenv = require('dotenv');
const sleep = require('time-sleep');

// Load biến môi trường
dotenv.config({path: '../configs/config.env'});
const {connectDB} = require('../configs/database');

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
});

const bankModel = require('../models/bank.model');
const mbbankHelper = require('../helpers/mbbank.helper')
const moment = require('moment');
const gameService = require('./game.service');
const bankService = require('./bank.service');
const historyService = require('./history.service');
const userModel = require('../models/user.model');
const historyModel = require("../models/history.model");
const settingModel = require('../models/setting.model');
const securityHelper = require("../helpers/security.helper");


const handleDesc = async (description) => {
    const desc = description.split(' ');

    return {
        username: desc[0],
        comment: desc[1]
    }
}

const history = async () => {
    try {
        const bank = await bankModel.findOne({status: 'active', loginStatus: 'active'}).lean();
        const dataSetting = await settingModel.findOne({});

        let status = 'wait';
        let check = 0;
        if (bank.bankType === 'mbb') {

            console.log(`Thực hiện kiểm tra lịch sử tài khoản mbb ${bank.accountNumber}`);
            var startTime = performance.now();

            const histories = await mbbankHelper.history(bank.accountNumber, bank.bankType);

            for (let history of histories) {

                let {creditAmount: amount, refNo: transId, addDescription: transactionDesc, description, bankName} = history;

                amount = parseInt(amount);

                const {username, comment} = await handleDesc(transactionDesc);

                // Kiem tra user
                let user = await userModel.findOne({username}).lean();

                // console.log(user);
                // Nhận tiền
                if (amount > 0 && !await historyModel.findOne({transId}).lean()) {

                    let {gameName, gameType} = await gameService.checkGame(comment);

                    if ((!gameName || !gameType)) status = 'errorComment';

                    if (!user) status = 'notUser';

                    if (status === 'wait' && await bankService.limitBet(bank.accountNumber, amount)) status = !await historyService.refundCount(user.username, dataSetting.refund.limit || 10) ? 'limitRefund' : 'limitBet';

                    await historyModel.findOneAndUpdate({transId}, {
                        $set: {
                            transId,
                            username: !user ? null : user.username,
                            receiver: bank.accountNumber,
                            gameName,
                            gameType,
                            amount,
                            fullComment: description,
                            result: status,
                            isCheck: bankName == 'MB' ? false : true,
                            comment,
                            timeTLS: new Date()
                        }
                    }, {upsert: true});

                    let histories = await historyModel.find({username: user.username}, {_id: 0, transId: 1, amount: 1, comment: 1, gameType: 1, result: 1, paid: 1, description: 1, createdAt: 1}).sort({ createdAt: -1 }).limit(10).lean();

                    let dataPost = {
                        success: true,
                        username: user.username,
                        histories
                    };

                    let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

                    socket.emit('cltx', dataEncode);

                    check++;
                }
            }

            var endTime = performance.now()
        }

        return `Done ${bank.accountNumber} wait ${check}, ${Math.round((endTime - startTime) / 1000)}s`
    } catch (e) {
        console.log(e);
    }
}

history();