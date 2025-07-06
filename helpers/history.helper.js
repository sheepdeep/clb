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
const oldBank = require('../json/bank.json');
const eximbankHelper = require('../helpers/eximbank.helper');
const transferModel = require('../models/transfer.model');
const momoModel = require('../models/momo.model');
const momoHelper = require("./momo.helper");
const giftModel = require('../models/gift.model');
const telgramHelper = require("./telegram.helper");
const {data} = require("express-session/session/cookie");

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

        const {username, comment} = await this.handleDesc(description);

        let user = await userModel.findOne({username}).lean();

        // Nhận tiền
        if (amount > 0) {

            let {gameName, gameType} = await gameService.checkGame(comment);

            const oneMinuteAgo = new Date(Date.now() - 60 * 1000); // Lấy thời gian 1 phút trước

            // Lấy 2 đơn gần nhất của user trong vòng 1 phút
            const recentOrders = await historyModel.find({
                username,
                timeTLS: { $gte: oneMinuteAgo }
            }).sort({ timeTLS: -1 }).limit(5);

            // Nếu đã có 2 đơn rồi, thì chặn đơn thứ 3
            if (recentOrders.length >= 5) {
                await historyModel.findOneAndUpdate({transId}, {
                    $set: {
                        transId,
                        username: user.username,
                        receiver: bank.accountNumber,
                        gameName,
                        gameType,
                        amount,
                        fullComment: description,
                        result: 'lose',
                        isCheck: bankName === 'MB' ? false : true,
                        comment,
                        timeTLS: moment(transactionDate, 'DD/MM/YYYY HH:mm:ss').format()
                    }
                }, {upsert: true}).lean();
            } else {
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
            }

            await this.handleTransId(transId);

            return true;
        }

    } catch (e) {
        console.log(e);
    }
};

exports.handleTransId = async (transId) => {
    try {

        const dataSetting = await settingModel.findOne();
        const history = await historyModel.findOne({transId});

        if (!await rewardModel.findOne({content: history.comment}).lean()) {
            const dataComment = await this.handleDesc(history.comment);
            history.comment = dataComment[1];
            history.save();
        }

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
                        {result: "ok"},
                        {result: "win"},
                        {result: "lose"},
                        {result: "notUser"},
                        {result: "refund"}
                    ]
                }
            ]
        })) {
            console.log('Mã giao dịch này đang xử lý hoặc đã xử lý, bỏ qua! #' + history.transId);
            return;
        }

        let user = await userModel.findOne({username: history.username}).lean();

        const randomBanks = await bankModel.aggregate([
            { $match: { bankType: 'exim', status: 'active' } },
            { $sample: { size: 1 } }
        ]);

        await historyModel.findOneAndUpdate({transId: history.transId}, {
                $set: {
                    bonus: Math.floor(history.amount * bonus),
                    paid,
                    result,
                }
            })

        if(result === 'lose') {

            const checkRefundDay = await historyModel.findOne({
                username: history.username,
                result: 'refund',
                createdAt: { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() }
            });

            const historyOld = await historyModel.findOne({
                username: history.username,
                createdAt: { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() }
            }).sort({ createdAt: -1 });

            const result = dataSetting.refund.data.filter(entry => {
                const min = parseInt(entry.min);
                const max = parseInt(entry.max);
                return historyOld.amount >= min && historyOld.amount <= max;
            });

            if (!checkRefundDay && historyOld && historyOld.result === 'lose' && result.length > 0) {
                const transId = `SBRF${Math.floor(Math.random() * (99999999 - 10000000) + 10000000)}`;

                const bonus = Math.floor(historyOld.amount * result[0].bonus / 100);

                const historyRefund = await historyModel.findOneAndUpdate({ transId }, {
                    $set: {
                        transId,
                        username: historyOld.username,
                        receiver: historyOld.receiver,
                        gameName: historyOld.gameName,
                        gameType: historyOld.gameType,
                        amount: bonus,
                        bonus,
                        transferType: 'momo',
                        result: 'refund',
                        paid: 'wait',
                        comment: historyOld.comment,
                        description: `Hoàn tiền đơn thua ${historyOld.transId}`,
                    }
                }, { upsert: true }).lean();

                setImmediate(async () => {
                    await this.transferMomo(await historyModel.findOne({transId: transId}).lean());
                });
            }


        } else if (result === 'win') {
            setImmediate(async () => {
                await this.transferMomo(history);
            });
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
};

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
};

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
};

exports.handleDesc = async (description) => {

    const desc = description.split(' ');

    let numberUser = 0;  // Initialize with -1 (indicating no user found yet)
    let numberReward = 0;  // Initialize with -1 (indicating no reward found yet)

    if (description.includes("MBVCB")) {
        const desc = description.split('.');
        const newDesc = desc[3].split(' ');

        return {
            username: newDesc[0],
            comment: newDesc[2].toUpperCase().replace(/\./g, '')
        };
    }

    if (description.includes("-")) {
        const desc = description.split('-');
        const newDesc = desc[1].split(' ');

        return {
            username: newDesc[0],
            comment: newDesc[1]?.toUpperCase().replace(/[.-]/g, '')
        };
    }

    // Loop through the words in desc
    if (desc[0] == 'CUSTOMER') {

        // const user =  await userModel.findOne({ username: { $regex: desc[1].toUpperCase(), $options: "i" } }).lean();

        return {
            username: desc[1],
            comment: desc[2].toUpperCase().replace(/[.-]/g, '')
        };
    }

    for (let i = 0; i < desc.length; i++) {
        // Check if the word matches a username
        if (await userModel.findOne({ username: desc[i].toLowerCase() })) {
            numberUser = i;  // Store index of the matching user
        }

        if (await rewardModel.findOne({content: desc[i].toUpperCase().replace(/[.-]/g, '')})) {
            numberReward = i;  // Store index of the matching reward
        }

    }


    return {
        username: desc[numberUser].toLowerCase(),
        comment: desc[numberReward].toUpperCase().replace(/[.-]/g, '')
    };
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

        await historyModel.deleteMany({gameType: 'CLTX_TELEGRAM'});
        await historyModel.deleteMany({gameType: 'RUTTIEN'});

        const bankData = await bankModel.findOne({status: 'active', loginStatus: 'active', bankType: 'mbb'}).lean();

        const dataSetting = await settingModel.findOne({});

        if (!dataSetting.fakeUser.data) {
            await sleep(30000);
            return await this.fakeBill();
        }

        if (dataSetting.checkTransId.status == 'close') {
            await sleep(30000);
            return await this.fakeBill();
        }

        if (bankData) {

            const transId = 'FT25038' + Math.floor(Math.random() * (999999999 - 100000000 + 1));
            const amount = parseInt(String(Math.floor(Math.random() * (dataSetting.fakeUser.max - dataSetting.fakeUser.min + 1)) + dataSetting.fakeUser.min) + '000');
            const bank = await bankModel.findOne({status: 'active', loginStatus: 'active'}).lean();

            const randomIndex = Math.floor(Math.random() * dataSetting.fakeUser.data.length);

            const randomReward = await rewardModel.aggregate([
                {
                    $match: {
                        gameType: { $in: ['CL_Game', 'TX_Game', 'CL2_Game'] }
                    }
                },
                {
                    $sample: { size: 1 }
                }
            ]);
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

            await sleep(5 * 10000);
            return await this.fakeBill();
        }

        await sleep(60 * 1000);
        return await this.fakeBill();

    } catch (e) {
        console.log(e);
        await sleep(60 * 1000);
        return await this.fakeBill();
    }
};

exports.generateRandomAlphanumeric = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

exports.gift = async () => {
    try {
        const code = "SB" + await this.generateRandomAlphanumeric(12);
        const bankReceiver = await bankModel.findOne({bankType: 'mbb'}).lean();
        const dataSetting = await settingModel.findOne({});

        await new giftModel({
            code,
            amount: Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000,
            playCount: 50000,
            limit: 1,
            status: 'active',
            type: 'balance',
            expiredAt: moment().add(1, 'days').toDate()
        }).save();

        const message = `<b>🎁 ${dataSetting.nameSite} PHÁT CODE 🎁</b>\n\n<b>💵 GIFTCODE: <code>${code}</code></b>\n\n<b>Truy cập ${dataSetting.nameSite} để trải nghiệm</b>`;
        console.log(await telegramHelper.sendText(dataSetting.telegram.token, dataSetting.telegram.chatId, message, "HTML"));

    } catch (e) {
        console.log(e);
    }
};

exports.telegramBot = async () => {
    try {

        const dataSetting = await settingModel.findOne();

        const tomorrow = moment().add(1, 'day');

        if (dataSetting.telegram.botGift == 'active') {
            const users = await userModel.find({ "telegram.chatId": { $ne: null } });

            const todayCode1 = `SBVIP${moment().format('DDMMYY')}`;
            const todayCode2 = `SB${moment().format('DDMMYY')}`;

            // Kiểm tra xem đã có code nào trong 2 cái trên chưa
            const existing = await giftModel.findOne({
                code: { $in: [todayCode1, todayCode2] }
            });

            if (!existing) {
                await new giftModel({
                    code: todayCode1,
                    amount: 200000,
                    limit: 10,
                    playCount: 5000000,
                    type: 'bank',
                    expiredAt: moment().add(1, 'days').toDate()
                }).save();

                await new giftModel({
                    code: todayCode2,
                    amount: 20000,
                    limit: 10,
                    playCount: 200000,
                    type: 'bank',
                    expiredAt: moment().add(1, 'days').toDate()
                }).save();
            }

            let msgRefund = '';  // Initialize msgRefund as an empty string

            for (let dataRefund of dataSetting.refund.data) {
                // Concatenate each refund message
                msgRefund += `💵 ${new Intl.NumberFormat('en-US').format(dataRefund.min)} - ${new Intl.NumberFormat('en-US').format(dataRefund.max)} [HOÀN ${dataRefund.bonus}%]\n`;
            }

            for (let user of users) {
                const message = `Xin  chào ${user.username} \n✅ ${dataSetting.nameSite} <b>Gửi tặng giftcode (HSD đến 23:59 ngày ${tomorrow.format('DD/MM')})</b> \n🎁 Gifcode VIP 200K --> 1tr: ${todayCode1} \n🎁 Gifcode Thường 20K: ${todayCode2} \n${msgRefund}👉 Nhận miễn phí 15k: <a href="https://${dataSetting.nameSite}/fan">[Tại Đây]</a>\n👉 Giới thiệu bạn bè chơi ${dataSetting.nameSite} để nhận 399k/lượt: <a href="https://${dataSetting.nameSite}/ctv">[Tại Đây]</a> \n👉 Kênh thông báo: <a href="${dataSetting.telegram.boxNoti}">[Tại Đây]</a> \nTRUY CẬP ${dataSetting.nameSite} NGAY ĐỂ NHẬN GIFTCODE NÀY!`
                console.log(await telegramHelper.sendText(dataSetting.telegram.token, user.telegram.chatId, message));
            }
        }

    } catch (e) {

    }
}

exports.reward = async() => {
    try {

        await historyModel.deleteMany({gameType: 'CLTX_TELEGRAM'});
        await historyModel.deleteMany({gameType: 'TXRONG'});

    } catch (err) {
        console.log(err);
        logHelper.create("rewardErr", `Lỗi khi trả thưởng [${err.message}]`)
        await sleep(60000);
        return await this.reward();
    }
};

exports.transferEximbank = async (history) => {
    try {
        const bankReward = await bankModel.aggregate([
            {
                $match: { otp: null, reward: false, bankType: "exim", status: "active" } // Điều kiện lọc
            },
            {
                $sample: { size: 1 }
            }
        ]);

        if (bankReward.length > 0) {
            const user = await userModel.findOne({username: history.username});

            if(user.bankInfo.accountNumber) {
                const dataBank = await bankModel.findOne({accountNumber: bankReward[0].accountNumber});

                console.log(`Thực hiện trả thưởng #${history.transId} => ${dataBank.accountNumber}`)
                const balance = await eximbankHelper.getBalance(dataBank.accountNumber, dataBank.bankType);

                if (!balance.success) {
                    await sleep(2000);
                    return await this.reward();
                }

                const checkNumber = await eximbankHelper.checkBank(dataBank.accountNumber, dataBank.bankType, user.bankInfo.bankCode, user.bankInfo.accountNumber)

                const dataTransfer = {
                    accountNumber: user.bankInfo.accountNumber,
                    bankCode: user.bankInfo.bankCode,
                    bankName: checkNumber.resultDecode.data.bankName,
                    name: checkNumber.resultDecode.data.name,
                    amount: history.bonus,
                    comment: 'hoan tien tiktok ' + String(history.transId).slice(-4)
                }

                const resultInitTransfer = await eximbankHelper.initTransfer(dataBank.accountNumber, dataBank.bankType, dataTransfer)

                console.log(resultInitTransfer);

                if (resultInitTransfer.success) {
                    history.transfer = dataBank.accountNumber;
                    history.save();

                    dataBank.reward = true;
                    dataBank.save();
                }
            } else {
                history.paid = 'bankerror';
                history.save();
                await sleep(2000);
                return await this.reward();
            }

            // let checkOTP = true;
            // while(checkOTP) {
            //     const dataBank = await bankModel.findOne({accountNumber: bankReward[0].accountNumber});

            //     if (dataBank.otp) {
            //         const result = await eximbankHelper.verifyTransfer(dataBank.accountNumber, dataBank.bankType, dataBank.otp);

            //         console.log(result);
            //         if (result.resultDecode.code == '00') {

            //             history.paid = 'sent';
            //             history.save();
            //             user.bankInfo.guard = true;
            //             user.save();

            //             await new transferModel({
            //                 transId: history.transId,
            //                 username: history.username,
            //                 firstMoney: balance.data.totalCurrentAmount,
            //                 amount: history.bonus,
            //                 lastMoney: balance.data.totalCurrentAmount - history.bonus,
            //                 comment: 'hoan tien tiktok ' + String(history.transId).slice(-4),
            //             }).save();

            //         } else {
            //             history.paid = 'hold';
            //             history.save();
            //         }

            //         await bankModel.findOneAndUpdate({accountNumber: dataBank.accountNumber}, {$set: {
            //             otp: null, reward: false, balance: balance.data.totalCurrentAmount - history.bonus
            //         }});

            //         break;
            //     }

            //     await sleep(1000);
            // }

        }
    } catch (error) {
        console.log(error);
    }
}

exports.transferMomo = async (history) => {
    try {
        const dataSetting = await settingModel.findOne({});
        history = await historyModel.findById(history._id);

        const bankReward = await momoModel.aggregate([
            {
                $match: { status: 'active', loginStatus: 'active' } // Điều kiện lọc
            },
            {
                $sample: { size: 1 }
            }
        ]);

        const checkTrans = await transferModel.findOne({transId: history.transId}).lean();
        if (checkTrans) {
            return {success: false, message: 'Mã đã được trả thưởng!'};
        }

        if (bankReward.length > 0) {
            const user = await userModel.findOne({username: history.username});

            if(user.bankInfo.accountNumber) {
                const dataBank = await momoModel.findOne({phone: bankReward[0].phone});

                console.log(`Thực hiện trả thưởng #${history.transId} => ${dataBank.phone}`)

                if (dataBank.balance <= history.bonus) {
                    history.paid = 'hold';
                    history.transfer = dataBank.phone;
                    history.transferType = 'momo';
                    history.save();
                    logHelper.create("rewardErr", `Momo ${dataBank.phone} [Hết tiền trả thưởng]`)
                    return {success: false};
                }

                let checkBank = oldBank.data.find(bank => bank.bin === user.bankInfo.bankCode);

                if (!checkBank) {
                    checkBank = oldBank.data.find(bank => bank.shortName === user.bankInfo.bankCode);
                }

                const dataTransfer = {
                    accountNumber: user.bankInfo.accountNumber,
                    bankCode: checkBank.bin,
                    bankName: checkBank.shortName,
                    amount: history.bonus,
                    comment: dataSetting.commentSite.rewardGD + String(history.transId).slice(-4)
                };

                let resultInitTransfer = await momoHelper.INIT_TOBANK(dataBank.phone, dataTransfer);

                if (resultInitTransfer?.error === 'insufficient_balance') {
                    history.paid = 'hold';
                    history.transfer = dataBank.phone;
                    history.transferType = 'momo';
                    history.save();
                    dataBank.reward = false;
                    dataBank.status = 'pending';
                    dataBank.save();
                    logHelper.create("rewardErr", `Momo ${dataBank.phone} [Hết tiền trả thưởng]`)
                    return {success: false};

                }

                if (resultInitTransfer.success) {
                    const balance = await momoHelper.balance(dataBank.phone);
                    await historyModel.findByIdAndUpdate(history._id, {paid: 'sent', transfer: dataBank.phone, transferType: 'momo'});
                    await userModel.findOneAndUpdate({username: history.username}, {$set: {"bankInfo.guard": true}});
                    await new transferModel({
                        transId: history.transId,
                        receiver: user.bankInfo.accountNumber,
                        transfer: dataBank.phone,
                        username: history.username,
                        firstMoney: dataBank.balance,
                        amount: history.bonus,
                        lastMoney: balance.balance,
                        comment: dataSetting.commentSite.rewardGD + String(history.transId).slice(-4)
                    }).save();
                    return {success: true};
                }
            } else {
                history.paid = 'bankerror';
                history.save();
            }

        }
    } catch (error) {
        console.log(error);
    }
}

exports.transferZalo = async (history) => {
    try {

    } catch (e) {

    }
}
