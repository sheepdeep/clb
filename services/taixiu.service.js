const turnTaiXiuModel = require('../models/turn.taixiu.model');
const settingModel = require('../models/setting.model');
const sleep = require('time-sleep');
const crypto = require('crypto');
const moment = require("moment/moment");
const historyService = require("./history.service");
const historyTaiXiuModel = require("../models/history-taixiu.model");
const historyModel = require("../models/history.model");
const historyHelper = require("../helpers/history.helper");
const momoService = require("./momo.service");
const momoHelper = require("../helpers/momo.helper");
const commentHelper = require("../helpers/comment.helper");
const logHelper = require("../helpers/log.helper");
const transferModel = require("../models/transfer.model");
const telegramHelper = require("../helpers/telegram.helper");

const setupKey = 'alomomoditmecuocdoi1111111111111';  // Có thể thay bằng khóa tĩnh
const iv = crypto.randomBytes(16); // Vector khởi tạo (IV) - 16 bytes

// Hàm mã hóa (Encode)
function encode(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', setupKey, iv);

    const data = typeof text === 'object' ? JSON.stringify(text) : text;

    let encrypted = cipher.update(data, 'utf-8', 'base64');  // Dùng 'base64' thay vì 'hex'
    encrypted += cipher.final('base64');

    return iv.toString('base64') + ':' + encrypted;
}

// Hàm giải mã (Decode)
function decode(encryptedText) {
    const [ivHex, encrypted] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', setupKey, Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

exports.handleTurn = async () => {
    try {
        const dataSetting = await settingModel.findOne({});
        if (!dataSetting) {
            console.log('Hệ thống chưa setup, thử lại sau 60s!')
            await sleep(60 * 1000);
            return await this.handleTurn();
        }

        if (dataSetting.siteStatus !== 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            await sleep(600 * 1000);
            return await this.handleTurn();
        }

        if (dataSetting.banTaiXiu.status !== 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            await sleep(600 * 1000);
            return await this.handleTurn();
        }

        const turn = await turnTaiXiuModel.findOne({status: 'running', turn: dataSetting.banTaiXiu.turn}).lean();

        // Khong tim thay turn tai xiu
        if (!turn) {

            console.log('Không tìm thấy turn tài xỉu thực hiện tạo phiên mới!');

            let timeStarted = new Date();
            let timeEnded = new Date(timeStarted.getTime() + 72 * 1000);

            await settingModel.findOneAndUpdate({}, {
                $set: {
                    "banTaiXiu.turn": parseInt(dataSetting.banTaiXiu.turn + 1)
                }
            });

            let xucxac1 = Math.floor(Math.random() * 6) + 1, xucxac2 = Math.floor(Math.random() * 6) + 1,
                xucxac3 = Math.floor(Math.random() * 6) + 1;
            let result = parseInt(xucxac1 + xucxac2 + xucxac3);

            await turnTaiXiuModel({
                turn: parseInt(dataSetting.banTaiXiu.turn + 1),
                second: parseInt(dataSetting.banTaiXiu.secondDefault),
                xucxac1: xucxac1,
                xucxac2: xucxac2,
                xucxac3: xucxac3,
                result: result,
                sumTai: 0,
                sumXiu: 0,
                timeStarted,
                timeEnded,
                millisecondsStarted: timeStarted.getTime(),
                millisecondsEnded: timeEnded.getTime(),
                status: 'running'
            }).save();
            return await this.handleTurn();
        }

        // Thuc hien xu ly second
        await turnTaiXiuModel.findOneAndUpdate({status: 'running', turn: dataSetting.banTaiXiu.turn}, {
            $set: {
                second: parseInt(turn.second - 1)
            }
        });
        // console.log('Phiên #' + dataSetting.banTaiXiu.turn + ' hiện tại còn ' + parseInt(turn.second - 1) + ' giây');

        let turnOld = await turnTaiXiuModel.findOne({turn: dataSetting.banTaiXiu.turn - 1}).lean();

        if (turnOld && turn.second <= 79 && turn.second >= 70) {

            let img_result = '<img class=dice-1 src=/themes/taixiu/image/xx/dice-' + turnOld.xucxac1 + '.png> <img class=dice-2 src=/themes/taixiu/image/xx/dice-' + turnOld.xucxac2 + '.png> <img class=dice-3 src=/themes/taixiu/image/xx/dice-' + turnOld.xucxac3 + '.png>';
            const dataPost = {
                turn: turnOld.turn,
                second: turn.second,
                sumTai: turnOld.sumTai,
                sumXiu: turnOld.sumXiu,
                userTai: turnOld.userTai.length,
                userXiu: turnOld.userXiu.length,
                result: turnOld.result,
                soiCau: await this.dataTurn(11),
                img_result
            }
            socket.emit("taixiu", dataPost);
            await sleep(1 * 1000);
            return await this.handleTurn();
        }

        if (turn.second <= 0) {

            turnOld = await turnTaiXiuModel.findOne({turn: dataSetting.banTaiXiu.turn}).lean();
            let maxEntryXiu, maxEntryTai
            maxEntryTai = turnOld.userTai.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userTai[0]);
            maxEntryXiu = turnOld.userXiu.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userXiu[0]);

            let textNoti = `🎲 Thông báo Tài Xỉu Bàn 🎰 %0APhiên: #${turnOld.turn} %0ASố tiền cược tài: ${Intl.NumberFormat('en-US').format(turnOld.sumTai)}đ %0ASố tiền cược xỉu: ${Intl.NumberFormat('en-US').format(turnOld.sumXiu)}đ %0AKết quả: ${turnOld.result} - [${turnOld.result > 10 ? 'Tài' : 'Xỉu'}] - [${turnOld.xucxac1} - ${turnOld.xucxac2} - ${turnOld.xucxac3}] %0A------------- %0A*${turnOld.result > 10 ? 'Chúc mừng ' + maxEntryTai.phone.slice(0, 6) + '****** đã thắng cược với số tiền ' + Intl.NumberFormat('en-US').format(maxEntryTai.amount) : 'Chúc mừng ' + maxEntryXiu.phone.slice(0, 6) + '****** đã thắng cược với số tiền ' + Intl.NumberFormat('en-US').format(maxEntryXiu.amount) }đ*`

            await telegramHelper.sendText(dataSetting.telegram.token, dataSetting.banTaiXiu.chatId, textNoti);

            let xucxac1 = Math.floor(Math.random() * 6) + 1, xucxac2 = Math.floor(Math.random() * 6) + 1,
                xucxac3 = Math.floor(Math.random() * 6) + 1;

            if (turn.xucxac1 > 0) {
                xucxac1 = turn.xucxac1;
            }

            if (turn.xucxac2 > 0) {
                xucxac2 = turn.xucxac2;
            }

            if (turn.xucxac3 > 0) {
                xucxac3 = turn.xucxac3;
            }

            let result = parseInt(xucxac1 + xucxac2 + xucxac3);
            let resultText;

            if (result <= 10) {
                resultText = 'xiu'
            } else {
                resultText = 'tai'
            }

            await turnTaiXiuModel.findOneAndUpdate({status: 'running', turn: dataSetting.banTaiXiu.turn}, {
                $set: {
                    status: 'done', xucxac1, xucxac2, xucxac3, result, resultText
                }
            });
            console.log('Phiên #' + dataSetting.banTaiXiu.turn + ' kết quả là ' + xucxac1 + ' - ' + xucxac2 + ' - ' + xucxac3 + ' [' + resultText + ']');
            await sleep(1 * 1000);
            return await this.handleTurn();
        }

        const dataPost = {
            turn: dataSetting.banTaiXiu.turn,
            second: turn.second,
            sumTai: turn.sumTai,
            sumXiu: turn.sumXiu,
            userTai: turn.userTai.length,
            userXiu: turn.userXiu.length,
            soiCau: await this.dataTurn(11)
        }

        socket.emit("taixiu", dataPost);

        await sleep(1 * 1000);
        return await this.handleTurn();

    } catch (e) {
        console.log(e);
        await sleep(1 * 1000);
        return await this.handleTurn();
    }
}

function getRandomEvenNumber(min, max) {
    // Tạo số ngẫu nhiên trong khoảng từ min đến max
    let randomNum = Math.floor(Math.random() * (max - min + 1)) + min;

    // Nếu số random không phải là số chẵn, cộng 1 để biến nó thành số chẵn
    if (randomNum % 2 !== 0) {
        randomNum++;
    }

    return randomNum;
}

function randomTaiOrXiu() {
    // Tạo số ngẫu nhiên giữa 0 và 1
    const randomNum = Math.random();

    // Nếu số ngẫu nhiên > 0.5, chọn "Tài", nếu không chọn "Xỉu"
    if (randomNum > 0.5) {
        return "tai";
    } else {
        return "xiu";
    }
}

exports.botTaiXiu = async () => {
    try {
        const dataSetting = await settingModel.findOne({});
        if (!dataSetting) {
            console.log('Hệ thống chưa setup, thử lại sau 60s!')
            await sleep(60 * 1000);
            return await this.handleTurn();
        }

        if (dataSetting.siteStatus !== 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            await sleep(600 * 1000);
            return await this.handleTurn();
        }

        if (dataSetting.banTaiXiu.status !== 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            await sleep(600 * 1000);
            return await this.handleTurn();
        }

        const turn = await turnTaiXiuModel.findOne({status: 'running', turn: dataSetting.banTaiXiu.turn}).lean();

        if (turn && turn.second > 10 && turn.second <= 60) {

            let phonePrefixes = ['092', '031', '077', '090', '093', '032', '034', '081', '082', '094'];
            let prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];

            let dataUser = {
                phone: prefix + getRandomEvenNumber(1000000, 9999999),
                amount: parseInt(String(getRandomEvenNumber(10, 5000)) + String((randomTaiOrXiu() === 'tai' ? dataSetting.banTaiXiu.commentXiu : dataSetting.banTaiXiu.commentTai))),
                comment: randomTaiOrXiu(),
            }

            if (dataUser.amount > 500000) {
                let textNoti = `🎲 Thông báo Tài Xỉu Bàn 🎰 %0APhiên: #${dataSetting.banTaiXiu.turn} %0A${dataUser.phone.slice(0, 6)}****** đã cược: ${Intl.NumberFormat('en-US').format(dataUser.amount)}đ vào [${dataUser.comment === 'xiu' ? 'Tài' : 'Xỉu'}] %0A------------- %0AHãy được cược theo nào ae ơi! alomomo.me`;
                await telegramHelper.sendText(dataSetting.telegram.token, dataSetting.telegram.chatId, textNoti);
            }

            if ((turn.userTai && turn.userTai.find(e => e.phone === dataUser.phone)) ||
                (turn.userXiu && turn.userXiu.find(e => e.phone === dataUser.phone))) {
                console.log('Trùng phone thực hiện tạo phone mới!');
                await sleep(5 * 1000);
                return await this.botTaiXiu();
            }

            if (dataUser.comment === 'xiu') {
                await turnTaiXiuModel.findByIdAndUpdate(
                    turn._id,
                    {
                        $push: {userXiu: dataUser},
                        sumXiu: parseInt(turn.sumXiu) + parseInt(dataUser.amount)
                    },
                    {new: true}
                );
            } else {
                await turnTaiXiuModel.findByIdAndUpdate(
                    turn._id,
                    {
                        $push: {userTai: dataUser},
                        sumTai: parseInt(turn.sumTai) + parseInt(dataUser.amount)
                    },
                    {new: true}
                );
            }

            await sleep(5 * 1000);
            return await this.botTaiXiu();
        } else {
            console.log('Không thấy turn!');

        }

        await sleep(2 * 1000);
        return await this.botTaiXiu();

    } catch (e) {
        console.log(e);
    }
}

exports.handleTurnTranId = async (data) => {
    try {

        const dataSetting = await settingModel.findOne({});
        let win, status, won;
        let bonus;
        // Thuc hien xu ly phien
        const turn = await turnTaiXiuModel.findOne({turn: data.turn, status: 'done'}).lean();
        if (!turn) {
            return;
        }

        const result = turn.result > 10 ? dataSetting.banTaiXiu.commentTai : dataSetting.banTaiXiu.commentXiu;

        if (await historyTaiXiuModel.findOne({
            transId: data.transId,
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
            return;
        }

        const dataMomoTransfer = await momoService.phoneRunTransfer(1);
        const momoTransfer = dataMomoTransfer[0];

        if (!momoTransfer) {
            console.log(`Số điện thoại không hoạt động, ${momoTransfer.phone} #${data.transId}`);
            await historyTaiXiuModel.findOneAndUpdate({transId: data.transId}, {
                $set: {
                    status: 'errorPhone',
                    description: `Số điện thoại không hoạt động, ${momoTransfer.phone} #${data.transId}`
                }
            });
            return;
        }

        if (result === data.comment) {
            status = 'win';
            bonus = Math.round(data.amount * dataSetting.banTaiXiu.ratio);

            let commentData = [
                {
                    name: 'transId',
                    value: data.transId,
                },
                {
                    name: 'comment',
                    value: data.comment,
                },
                {
                    name: 'amount',
                    value: data.amount,
                },
                {
                    name: 'bonus',
                    value: bonus,
                }
            ];
            let rewardComment = await commentHelper.dataComment(dataSetting.banTaiXiu.rewardGD, commentData);

            if (await transferModel.findOne({
                receiver: data.partnerId,
                amount: bonus,
                comment: rewardComment
            })) {
                console.log(`#${data.transId} đã được trả thưởng trước đó, bỏ qua!`);
                await historyTaiXiuModel.findOneAndUpdate({transId: data.transId}, {$set: {status: 'win'}});
                return;
            }

            await historyTaiXiuModel.findOneAndUpdate({transId: data.transId}, {
                $set: {
                    status: 'waitReward',
                    bonus
                }
            });

            let transfer = await momoHelper.moneyTransfer(momoTransfer.phone, {
                phone: data.partnerId,
                amount: bonus,
                comment: rewardComment
            });

            if (!transfer || !transfer.success) {

                await logHelper.create('rewardTransId', `Trả thưởng thất bại!\n* [ ${momoTransfer.phone} | ${data.transId} ]\n* [ ${transfer.message} ]`);

                let phoneNew = await momoService.phoneRunTransfer(1);
                phoneNew = phoneNew[0];

                if (!phoneNew) {
                    console.log('Không tìm thấy số mới #' + transId);
                    return;
                }

                await historyTaiXiuModel.findOneAndUpdate({transId: data.transId}, {
                    $set: {
                        status: 'wait',
                        description: `${momoTransfer.phone} chuyển tiền thất bại: ${transfer.message}, chuyển sang số ${phoneNew} để trả thưởng!`
                    }
                });
                return await this.handleTurnTranId(data);
            }

            await historyTaiXiuModel.findOneAndUpdate({transId: data.transId}, {
                $set: {
                    status,
                }
            });

            return {
                transId: data.transId,
                partnerId: data.partnerId,
                partnerName: data.partnerName,
                bonus,
                status
            }
        }

        await historyTaiXiuModel.findOneAndUpdate({transId: data.transId}, {
            $set: {
                status: 'won',
            }
        });

    } catch (e) {
        console.log(e);
    }
}

exports.runReward = async () => {
    const dataSetting = await settingModel.findOne();
    let threads = [];

    if (dataSetting.banTaiXiu.rewardType === 'limit') {
        let dataHistory = await historyTaiXiuModel.aggregate([
            {
                $match: {
                    status: 'wait'
                }
            },
            {
                $sample: {size: Number(dataSetting.banTaiXiu.rewardLimit)}
            }
        ]);

        for (let data of dataHistory) {
            threads.push(this.handleTurnTranId(data));
        }
    } else {
        // let dataPhone = await momoService.phoneRunTransfer(dataSetting.limitPhone);
        //
        // for (let data of dataPhone) {
        //     threads.push(historyHelper.rewardPhone(data.phone));
        // }
    }

    return await Promise.all(threads);
}

exports.dataInfo = async (dataTurn) => {
    try {

        const dataSetting = await settingModel.findOne({});
        let [totalUserTai, totalUserXiu] = await Promise.all([historyTaiXiuModel.aggregate([{
            $match: {
                turn: dataTurn.turn,
                comment: dataSetting.banTaiXiu.commentTai
            }
        }, {$group: {_id: null, count: {$sum: 1}}}]), historyTaiXiuModel.aggregate([{
            $match: {
                turn: dataTurn.turn,
                comment: dataSetting.banTaiXiu.commentXiu
            }
        }, {$group: {_id: null, count: {$sum: 1}}}])]);
        let [userSumTai, userSumXiu] = await Promise.all([historyTaiXiuModel.aggregate([{
            $match: {
                turn: dataTurn.turn,
                comment: dataSetting.banTaiXiu.commentTai
            }
        }, {
            $group: {
                _id: null,
                amount: {$sum: '$amount'}
            }
        }]), historyTaiXiuModel.aggregate([{
            $match: {
                turn: dataTurn.turn,
                comment: dataSetting.banTaiXiu.commentXiu
            }
        }, {$group: {_id: null, amount: {$sum: '$amount'}}}])]);

        userSumTai = !userSumTai.length ? 0 : userSumTai[0].amount;
        userSumXiu = !userSumXiu.length ? 0 : userSumXiu[0].amount;

        let earning = dataTurn.result > 10 ? userSumXiu - Math.round(userSumTai * dataSetting.banTaiXiu.ratio) : userSumTai - Math.round(userSumXiu * dataSetting.banTaiXiu.ratio);

        return ({
            ...dataTurn,
            userSumTai,
            userSumXiu,
            totalUserTai: !totalUserTai.length ? 0 : totalUserTai[0].count,
            totalUserXiu: !totalUserXiu.length ? 0 : totalUserXiu[0].count,
            earning
        })
    } catch (err) {
        console.log(err);
        return ({
            ...dataTurn,
            userSumTai: 0,
            userSumXiu: 0,
            totalUserTai: 0,
            totalUserXiu: 0,
            earning: 0
        })
    }
}

exports.handleTurnDone = async (tranId, comment, partnerId, amount, partnerName, time, phone) => {
    try {
        const dataSetting = await settingModel.findOne({}).lean();
        const commentGame = String(amount).slice(-2);
        let turn = await turnTaiXiuModel.find({
            millisecondsStarted: {$lte: time},
            millisecondsEnded: {$gte: time}
        });
        turn = turn[0];
        // TODO: kiểm tra lịch sử giao dịch

        console.log(turn);

        const historyTaiXiu = await historyTaiXiuModel.findOne({transId: tranId}).lean();
        if (dataSetting.banTaiXiu.betMin > amount || dataSetting.banTaiXiu.betMax < amount) {
            await historyTaiXiuModel({
                turn: turn.turn,
                transId: tranId,
                partnerId,
                partnerName,
                phone,
                amount,
                comment: commentGame,
                time,
                status: 'limitBet'
            }).save();
            console.log(tranId, 'limitBet');
            return;
        }

        const checkHistoryOnTurn = await historyTaiXiuModel.findOne({partnerId, turn: dataSetting.banTaiXiu.turn}).lean();

        if (!historyTaiXiu && turn) {
            let commentText;
            if (dataSetting.banTaiXiu.commentTai === commentGame) {
                commentText = 'tai';
            } else {
                commentText = 'xiu';
            }

            if (checkHistoryOnTurn && checkHistoryOnTurn.comment !== commentText) {
                return;
            }

            if (commentGame === dataSetting.banTaiXiu.commentTai || commentGame === dataSetting.banTaiXiu.commentXiu) {

                let textnoti = `Mã tham chiếu: ${tranId} %0ASố tiền: ${Intl.NumberFormat('en-US').format(amount)} %0ANội dung: ${commentGame || null} %0ANgười chơi: ${partnerId}`
                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textnoti)

                await historyTaiXiuModel({
                    turn: turn.turn,
                    transId: tranId,
                    partnerId,
                    partnerName,
                    phone,
                    amount,
                    comment: commentGame,
                    time,
                    status: 'wait'
                }).save();

                if (commentGame === dataSetting.banTaiXiu.commentTai) {
                    await turnTaiXiuModel.findByIdAndUpdate(
                        turn._id,
                        {
                            $push: {
                                userTai: {
                                    phone: partnerId,
                                    amount,
                                    comment: 'tai'
                                }
                            },
                            $inc: {sumTai: parseInt(turn.sumTai + amount)}
                        },
                        {new: true}
                    );
                } else {
                    await turnTaiXiuModel.findByIdAndUpdate(
                        turn._id,
                        {
                            $push: {
                                userXiu: {
                                    phone: partnerId,
                                    amount,
                                    comment: 'xiu'
                                }
                            },
                            $inc: {sumXiu: parseInt(turn.sumXiu + amount)}
                        },
                        {new: true}
                    );
                }
            }
        } else {
            console.log(tranId, 'Đã được lưu mà lịch sử hoặc không thấy phiên!');
        }

    } catch (e) {
        console.log(e);
        return;
    }
}

function isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
}

exports.dataTurn = async (limit) => {
    try {
        let soiCau = {
            labels: [],
            result: [],
            xuc_xac_1: [],
            xuc_xac_2: [],
            xuc_xac_3: [],
            image: []
        };

        let results = await turnTaiXiuModel.find({ status: 'done' })
            .sort({ createdAt: 'desc' })
            .limit(limit);

        results.sort((a, b) => a.turn - b.turn);

        soiCau = results.reduce((acc, history) => {
            acc.labels.push("#" + history.turn);
            acc.result.push(history.result);
            acc.xuc_xac_1.push(history.xucxac1);
            acc.xuc_xac_2.push(history.xucxac2);
            acc.xuc_xac_3.push(history.xucxac3);
            acc.image.push(history.result > 10 ? 'tai' : 'xiu')
            return acc;
        }, soiCau);

        return soiCau;
    } catch (e) {

    }
}
