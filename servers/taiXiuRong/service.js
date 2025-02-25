const sleep = require('time-sleep');
const turnTaiXiuModel = require('../../models/turn.taixiu-rong.model.js');
const settingModel = require('../../models/setting.model');
const securityHelper = require("../../helpers/security.helper");

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

            let xucxac1 = Math.floor(Math.random() * 6) + 1, xucxac2 = Math.floor(Math.random() * 6) + 1,
                xucxac3 = Math.floor(Math.random() * 6) + 1;
            let result = parseInt(xucxac1 + xucxac2 + xucxac3);

            await turnTaiXiuModel({
                turn: parseInt(settingTurnOld) + 1,
                second: parseInt(dataSetting.banTaiXiu.secondTaiXiuRong),
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

            return await this.run();
        }

        // Thuc hien xu ly second
        await turnTaiXiuModel.findOneAndUpdate({status: 'running'}, {
            $set: {
                second: parseInt(turn.second - 1)
            }
        });

        console.log('Phiên #' + settingTurnOld + ' hiện tại còn ' + parseInt(turn.second - 1) + ' giây');


        if (turn.second <= 0) {

            let turnOld = await turnTaiXiuModel.findOne({turn: dataSetting.banTaiXiu.turnTaiXiuRong}).lean();
            // let maxEntryXiu, maxEntryTai
            // maxEntryTai = turnOld.userTai.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userTai[0]);
            // maxEntryXiu = turnOld.userXiu.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userXiu[0]);

            let result = parseInt(turn.result);
            let resultText;

            if (result <= 10) {
                resultText = 'xiu'
            } else {
                resultText = 'tai'
            }

            await turnTaiXiuModel.findOneAndUpdate({status: 'running'}, {
                $set: {
                    status: 'done', resultText
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

            console.log('Phiên #' + dataSetting.banTaiXiu.turnTaiXiuRong + ' kết quả là ' + turn.xucxac1 + ' - ' + turn.xucxac2 + ' - ' + turn.xucxac3 + ' [' + resultText + ']');
            await sleep(1 * 1000);
            return await this.run();
        }

        if (turn.second > 60) {

            let turnOld = await turnTaiXiuModel.findOne({turn: parseInt(dataSetting.banTaiXiu.turnTaiXiuRong) - 1}).lean();
            // let maxEntryXiu, maxEntryTai
            // maxEntryTai = turnOld.userTai.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userTai[0]);
            // maxEntryXiu = turnOld.userXiu.reduce((max, entry) => entry.amount > max.amount ? entry : max, turnOld.userXiu[0]);

            let result = parseInt(turnOld.result);
            let resultText;

            const dataPost = {
                turn: turnOld.turn,
                second: turn.second,
                sumTai: turnOld.sumTai,
                sumXiu: turnOld.sumXiu,
                userTai: turnOld.userTai.length,
                userXiu: turnOld.userXiu.length,
                soiCau: await this.dataTurn(11),
                dice1: turnOld.xucxac1,
                dice2: turnOld.xucxac2,
                dice3: turnOld.xucxac3,
            }

            let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

            console.log(dataPost);
            socket.emit("taiXiuRong", dataEncode);
            await sleep(1 * 1000);
            return await this.run();
        }

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
