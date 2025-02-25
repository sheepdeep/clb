
const axios = require("axios");
const dotenv = require('dotenv');
const sleep = require('time-sleep');
// Import socket.io-client để kết nối đến servers
const socket = require('socket.io-client')('http://localhost'); // Kết nối đến servers đang chạy trên localhost:3000

// Load biến môi trường
dotenv.config({path: '../configs/config.env'});
const {connectDB} = require('../configs/database');

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
});

const settingModel = require('../models/setting.model');
const xsstModel = require('../models/xsst.model');
const historyModel = require('../models/history.model');

// Kết nối thành công
socket.on('connect', () => {
    console.log('Đã kết nối với servers');
    // setInterval(async () => {
    //     const data = await handleTurn();
    //
    //     socket.emit('xsst', data);
    // }, 1000);  // Gửi sau 1 giây
});

const handleTurn = async () => {
    try {

        const dataSetting = await settingModel.findOne();
        const turn = await xsstModel.findOne({status: 'running'}).lean();
        const turnOld = await xsstModel.findOne({status: 'done'}).sort({ _id: -1 }).lean();

        if (!dataSetting) {
            console.log('Hệ thống chưa setup, thử lại sau 60s!');
            return;
        }

        if (dataSetting.siteStatus !== 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            return;
        }

        if (!turn) {
            console.log('Không tìm thấy turn xsst đang tạo lại!');

            let timeStarted = new Date();
            let timeEnded = new Date(timeStarted.getTime() + dataSetting.xsst.secondDefault * 1000);

            const result = {
                gdb: Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                g1: Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                g2: [
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                ],
                g3: [
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                    Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
                ],
                g4: [
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                ],
                g5: [
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
                ],
                g6: [
                    Math.floor(Math.random() * (999 - 100 + 1)) + 100,
                    Math.floor(Math.random() * (999 - 100 + 1)) + 100,
                    Math.floor(Math.random() * (999 - 100 + 1)) + 100,
                ],
                g7: [
                    Math.floor(Math.random() * (99 - 1 + 1)) + 1,
                    Math.floor(Math.random() * (99 - 1 + 1)) + 1,
                    Math.floor(Math.random() * (99 - 1 + 1)) + 1,
                    Math.floor(Math.random() * (99 - 1 + 1)) + 1,
                ]
            }

            const dataNew = await new xsstModel({
                turn: dataSetting.xsst.turn + 1,
                second: dataSetting.xsst.secondDefault,
                timeStarted,
                timeEnded,
                millisecondsStarted: timeStarted.getTime(),
                millisecondsEnded: timeEnded.getTime(),
                status: 'running',
                result
            }).save();

            return {
                success: true,
                turn: dataSetting.xsst.turn + 1,
                second: dataSetting.xsst.secondDefault,
                result: turnOld?.result
            }

        }

        // if (turn.second > 114) {
        //
        //     if (turn.second === 114) {
        //         const result = {
        //             gdb: Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //             g1: Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //             g2: [
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //             ],
        //             g3: [
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //                 Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000,
        //             ],
        //             g4: [
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //             ],
        //             g5: [
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //                 Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000,
        //             ],
        //             g6: [
        //                 Math.floor(Math.random() * (999 - 100 + 1)) + 100,
        //                 Math.floor(Math.random() * (999 - 100 + 1)) + 100,
        //                 Math.floor(Math.random() * (999 - 100 + 1)) + 100,
        //             ],
        //             g7: [
        //                 Math.floor(Math.random() * (99 - 1 + 1)) + 1,
        //                 Math.floor(Math.random() * (99 - 1 + 1)) + 1,
        //             ]
        //         }
        //
        //         await xsstModel.findOneAndUpdate({status: 'running'}, {
        //             $set: {
        //                 second: parseInt(turn.second - 1),
        //                 result
        //             }
        //         });
        //
        //         return {
        //             success: true,
        //             turn: turn.turn,
        //             second: turn.second - 1,
        //             result: result
        //         }
        //     }
        //
        //     await xsstModel.findOneAndUpdate({status: 'running'}, {
        //         $set: {
        //             second: parseInt(turn.second - 1)
        //         }
        //     });
        //
        //     return {
        //         success: true,
        //         turn: turn.turn,
        //         second: turn.second - 1,
        //
        //     }
        // }

        if (turn.second > 0 && turn.second > 54) {
            // console.log('Phiên #' + dataSetting.xsst.turn + ' kết quả là ' + xucxac1 + ' - ' + xucxac2 + ' - ' + xucxac3 + ' [' + resultText + ']');

            await xsstModel.findOneAndUpdate({status: 'running'}, {
                $set: {
                    second: parseInt(turn.second - 1)
                }
            });

            return {
                success: true,
                turn: turn.turn,
                second: turn.second - 1,
                result: turnOld?.result
            }
        }

        if (turn.second <= 54 && turn.second > 0) {
            await xsstModel.findOneAndUpdate({status: 'running'}, {
                $set: {
                    second: parseInt(turn.second - 1)
                }
            });

            return {
                success: true,
                turn: turn.turn,
                second: turn.second - 1,
                result: turn.result
            }
        }

        if (turn.second <= 0) {

            await settingModel.findOneAndUpdate({}, {
                $set: {
                    "xsst.turn": parseInt(dataSetting.xsst.turn + 1)
                }
            });

            await xsstModel.findOneAndUpdate({status: 'running'}, {
                $set: {
                    status: 'done'
                }
            });

            return {
                success: true,
                turn: turn.turn,
                second: turn.second - 1
            }
        }

    } catch (e) {
        console.log(e);
        return;
    }

}

const paidTurn = async () => {
    try {

        const histories = await historyModel.find({gameName: 'XSST', result: 'wait'}).lean();

        for (let history of histories) {

            const check = history.gameType.split("_");

            const xsst = await xsstModel.findOne({turn: check[1], status: 'done'});


            // Dồn tất cả 2 chữ số cuối vào một mảng duy nhất
            let allLastTwoDigits = [];

            // Duyệt qua các mảng trong đối tượng `result`
            Object.values(xsst.result).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(num => {
                        allLastTwoDigits.push(getLastTwoDigits(num)); // Lấy 2 chữ số cuối và thêm vào mảng
                    });
                }
            });

            const numbers = allLastTwoDigits.map(num => num < 10 ? `0${num}` : `${num}`);
            const checkArray =  history.comment.replace(/\s+/g, '').split('-').filter(item => item);  // Mảng các giá trị cần kiểm tra

            const commonNumbers = checkArray.filter(item => numbers.includes(item));
            const count = checkArray.filter(item => commonNumbers.includes(item)).length;
            console.log(commonNumbers);
            console.log(count);


        }

    } catch (e) {

    }
}

const getLastTwoDigits = (num) => {
    return num % 100;
}

paidTurn();