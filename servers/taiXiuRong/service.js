const sleep = require('time-sleep');
const turnTaiXiuModel = require('../../models/turn.taixiu-rong.model.js');
const settingModel = require('../../models/setting.model');
const securityHelper = require("../../helpers/security.helper");
const telegramHelper = require("../../helpers/telegram.helper");
const moment = require("moment");

exports.run = async () => {
    try {
        const turn = await turnTaiXiuModel.findOne({status: 'running'}).lean();
        const dataSetting = await settingModel.findOne({});
        const settingTurnOld = dataSetting.banTaiXiu?.turnTaiXiuRong ? dataSetting.banTaiXiu.turnTaiXiuRong : 0;

        // Khong tim thay turn tai xiu
        if (!turn) {

            console.log('Không tìm thấy turn tài xỉu thực hiện tạo phiên mới!');

            let timeStarted = new Date();
            let timeEnded = new Date(timeStarted.getTime() + 72 * 1000);

            await settingModel.findOneAndUpdate({}, {
                $set: {
                    "banTaiXiu.turnTaiXiuRong": parseInt(settingTurnOld) + 1
                }
            });


            const turnNew = await turnTaiXiuModel({
                turn: parseInt(settingTurnOld) + 1,
                second: parseInt(dataSetting.banTaiXiu.secondTaiXiuRong),
                sumTai: 0,
                sumXiu: 0,
                timeStarted,
                timeEnded,
                millisecondsStarted: timeStarted.getTime(),
                millisecondsEnded: timeEnded.getTime(),
                status: 'running'
            }).save();

            // Gửi thông báo phiên mới
            let textNoti = `🎲 <b>Đã tạo phiên mới</b> 🎲 \n\n⏰ <b>Phiên hiện tại: #${turnNew.turn} bắt đầu</b> \n⏳ <b>Thời gian đặt cược: ${moment(timeStarted).format('DD-MM-YYYY HH:mm:ss')}</b> \n⌛️ <b>Thời gian kết thúc: ${moment(timeEnded).format('DD-MM-YYYY HH:mm:ss')}</b> \n\n<b><i>(lưu ý: bạn có 60s để đặt cược)</i></b> \n<b>SUPBANK.ME Chúc các ông chủ may mắn.</b>`;
            await telegramHelper.sendText(dataSetting.telegram.token, dataSetting.banTaiXiu.chatId, textNoti, 'HTML');

            return await this.run();
        }

        if (turn.second <= 0) {

            let turnOld = await turnTaiXiuModel.findOne({turn: dataSetting.banTaiXiu.turnTaiXiuRong}).lean();
            // let maxEntryXiu, maxEntryTai
            // maxEntryTai = turnOld.userTai.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userTai[0]);
            // maxEntryXiu = turnOld.userXiu.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userXiu[0]);

            let xucxac1 = await telegramHelper.sendDice(dataSetting.telegram.token, dataSetting.banTaiXiu.chatId)
            xucxac1 = xucxac1.data.result.dice.value;

            let xucxac2 = await telegramHelper.sendDice(dataSetting.telegram.token, dataSetting.banTaiXiu.chatId)
            xucxac2 = xucxac2.data.result.dice.value;

            let xucxac3 = await telegramHelper.sendDice(dataSetting.telegram.token, dataSetting.banTaiXiu.chatId)
            xucxac3 = xucxac3.data.result.dice.value;

            let result = parseInt(xucxac1 + xucxac2 + xucxac3);
            let resultText;

            if (result <= 10) {
                resultText = 'xiu'
            } else {
                resultText = 'tai'
            }

            const numberIcons = {
                "1": "1️⃣",
                "2": "2️⃣",
                "3": "3️⃣",
                "4": "4️⃣",
                "5": "5️⃣",
                "6": "6️⃣",
                "7": "7️⃣",
                "8": "8️⃣",
                "9": "9️⃣",
                "0": "0️⃣"
            };

            await turnTaiXiuModel.findOneAndUpdate({status: 'running'}, {
                $set: {
                    status: 'done', resultText, result
                }
            });

            const dataPost = {
                turn: dataSetting.banTaiXiu.turn,
                second: turn.second,
                sumTai: turn.sumTai,
                sumXiu: turn.sumXiu,
                userTai: turn.userTai.length,
                userXiu: turn.userXiu.length,
                soiCau: await this.dataTurn(11),
            }

            let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

            socket.emit("taiXiuRong", dataEncode);

            console.log('Phiên #' + dataSetting.banTaiXiu.turnTaiXiuRong + ' kết quả là ' + xucxac1 + ' - ' + xucxac2 + ' - ' + xucxac3 + ' [' + resultText + ']');

            let textNoti = `🎲 <b>KẾT QUẢ PHIÊN #${turnOld.turn}</b> 🎲 \n\n🎯 <b>${numberIcons[xucxac1.toString()] || result} - ${numberIcons[xucxac2.toString()] || result} - ${numberIcons[xucxac3.toString()] || result} 🟰 ${resultText == 'tai' ? '🔴 TÀI' : '⚫️ XỈU'}</b> 🎯`;
            await telegramHelper.sendText(dataSetting.telegram.token, dataSetting.banTaiXiu.chatId, textNoti, 'HTML');

            await sleep(1 * 1000);
            return await this.run();
        }

        // Thuc hien xu ly second
        await turnTaiXiuModel.findOneAndUpdate({status: 'running'}, {
            $set: {
                second: parseInt(turn.second - 1)
            }
        });
        // if (turn.second > 60) {
        //
        //     let turnOld = await turnTaiXiuModel.findOne({turn: parseInt(dataSetting.banTaiXiu.turnTaiXiuRong) - 1}).lean();
        //     // let maxEntryXiu, maxEntryTai
        //     // maxEntryTai = turnOld.userTai.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userTai[0]);
        //     // maxEntryXiu = turnOld.userXiu.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userXiu[0]);
        //
        //     let result = parseInt(turnOld.result);
        //     let resultText;
        //
        //     const dataPost = {
        //         turn: turnOld.turn,
        //         second: turn.second,
        //         sumTai: turnOld.sumTai,
        //         sumXiu: turnOld.sumXiu,
        //         userTai: turnOld.userTai.length,
        //         userXiu: turnOld.userXiu.length,
        //         soiCau: await this.dataTurn(11),
        //         dice1: turnOld.xucxac1,
        //         dice2: turnOld.xucxac2,
        //         dice3: turnOld.xucxac3,
        //     }
        //
        //     let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));
        //
        //     console.log(dataPost);
        //     socket.emit("taiXiuRong", dataEncode);
        //     await sleep(1 * 1000);
        //     return await this.run();
        // }
        //
        if (turn.second <= 60) {
            const dataPost = {
                turn: turn.turn,
                second: turn.second,
                sumTai: turn.sumTai,
                sumXiu: turn.sumXiu,
                userTai: turn.userTai.length,
                userXiu: turn.userXiu.length,
                soiCau: await this.dataTurn(11),
            }

            let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

            socket.emit("taiXiuRong", dataEncode);
        }

        await sleep(1 * 1000);
        return await this.run();
    } catch (e) {
        console.log(e);
    }
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

        let results = await turnTaiXiuModel.find({status: 'done'})
            .sort({createdAt: 'desc'})
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
