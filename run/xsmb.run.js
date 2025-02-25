const axios = require("axios");
const dotenv = require('dotenv');
const sleep = require('time-sleep');
const socket = require('socket.io-client')('http://localhost'); // Kết nối đến servers đang chạy trên localhost:3000

// Load biến môi trường
dotenv.config({path: '../configs/config.env'});
const {connectDB} = require('../configs/database');

connectDB().then(() => {
    console.log('Chạy file với kết nối DB hiện tại');
    run();
});

const settingModel = require('../models/setting.model');
const xsstModel = require('../models/xsst.model');
const historyModel = require('../models/history.model');
const xsmbHelper = require('../helpers/xsmb.helper');
const userModel = require('../models/user.model');
const moment = require("moment/moment");

// Kết nối thành công
// socket.on('connect', () => {
//     console.log('Đã kết nối với servers');
//     // setInterval(async () => {
//     //     const data = await handleTurn();
//     //
//     //     socket.emit('xsst', data);
//     // }, 1000);  // Gửi sau 1 giây
// });


const run = async () => {
    const now = new Date(); // Lấy thời gian hiện tại
    const years = now.getFullYear();
    const months = now.getMonth() + 1;
    const days = now.getDate();
    const hours = now.getHours(); // Lấy giờ hiện tại (0-23)
    const minutes = now.getMinutes(); // Lấy phút hiện tại (0-59)

    const dataSetting = await settingModel.findOne({});
    const dateOld = dataSetting.xsmb.date;

    const dataXsmb = await xsmbHelper.getAll();

    if (hours === 18 && minutes === 0) {
        if (dateOld !== dataXsmb.time) {
            dataSetting.xsmb.date = `${days}-${months}-${years}`;
            dataSetting.xsmb.results = dataXsmb.results;
            dataSetting.save();
            console.log('Cập nhật lại date thành công!');
        }
    } else {

        const targetTime = new Date(now);
        targetTime.setHours(18, 0, 0, 0);

        let histories = await historyModel.find(
            {result: 'wait', timeCheck:
                    { $gte: moment(moment().format('YYYY-MM-DD')).startOf('day').toDate(), $lt: moment(moment().format('YYYY-MM-DD')).endOf('day').toDate() }
            });

        for (let history of histories) {
            // Dồn tất cả 2 chữ số cuối vào một mảng duy nhất
            let allLastTwoDigits = [];

            // Duyệt qua các mảng trong đối tượng `result`
            Object.values(dataXsmb.results).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(num => {
                        allLastTwoDigits.push(getLastTwoDigits(num)); // Lấy 2 chữ số cuối và thêm vào mảng
                    });
                }
            });
            const numbers = allLastTwoDigits.map(num => num < 10 ? `0${num}` : `${num}`);
            const check = history.gameType.split("_");

            if (check[1] === 'LO') {
                const checkArray =  history.comment.replace(/\s+/g, '').split('-').filter(item => item);
                // Lấy số thắng
                const numberWin = checkArray.filter(item => numbers.includes(item));
                const countNumberWin = numberWin.length;
                const count = checkArray.filter(item => numbers.includes(item)).length;

                if (countNumberWin > 0) {
                    // Số tiền đặt cược thắng
                    const amount = (history.amount / history.comment.replace(/\s+/g, '').split('-').length) * countNumberWin;

                    // Số tiền nhận
                    const bonus = amount * dataSetting.xsmb.ratioLo;

                    if (history.receiver === 'system') {
                        await historyModel.findByIdAndUpdate(history._id, {
                            result: 'win',
                            paid: 'sent',
                            bonus
                        });

                        const user = await userModel.findOne({username: history.username});
                        user.balance = user.balance + bonus;
                        user.save();

                        continue;
                    } else {
                        await historyModel.findByIdAndUpdate(history._id, {
                            result: 'win',
                            paid: 'wait',
                            bonus
                        });

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
                                },
                                {
                                    text: "🔓 Mã OTP 🔓",  // Văn bản trên button
                                    callback_data: `otp_${history.transId}`,
                                }
                            ]
                        ];

                        await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textMessage, 'HTML', buttons);
                        continue;
                    }

                } else {
                    await historyModel.findByIdAndUpdate(history._id, {
                        result: 'lose',
                        paid: 'sent',
                    });
                    continue;
                }

            }

            if (check[1] === 'DE') {
                const checkArray = history.comment.replace(/\s+/g, '').split('-').filter(item => item);
                let giaiDacBiet = [];
                giaiDacBiet.push(String(getLastTwoDigits(dataXsmb.results['ĐB'][0])));

                const numberWin = checkArray.filter(item => giaiDacBiet.includes(item));
                const countNumberWin = numberWin.length;

                if (countNumberWin > 0) {
                    // Số tiền đặt cược thắng
                    const amount = (history.amount / history.comment.replace(/\s+/g, '').split('-').length) * countNumberWin;

                    // Số tiền nhận
                    const bonus = amount * dataSetting.xsmb.ratioDe;

                    if (history.receiver === 'system') {
                        await historyModel.findByIdAndUpdate(history._id, {
                            result: 'win',
                            paid: 'sent',
                            bonus
                        });

                        const user = await userModel.findOne({username: history.username});
                        user.balance = user.balance + bonus;
                        user.save();

                        continue;
                    } else {
                        await historyModel.findByIdAndUpdate(history._id, {
                            result: 'win',
                            paid: 'wait',
                            bonus
                        });

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
                                },
                                {
                                    text: "🔓 Mã OTP 🔓",  // Văn bản trên button
                                    callback_data: `otp_${history.transId}`,
                                }
                            ]
                        ];

                        await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textMessage, 'HTML', buttons);
                        continue;
                    }

                } else {
                    await historyModel.findByIdAndUpdate(history._id, {
                        result: 'lose',
                        paid: 'sent',
                    });
                    continue;
                }
            }

            if (check[1] === 'XIEN2') {
                const checkArray = history.comment.replace(/\s+/g, '').split('-').filter(item => item);
                let giaiDacBiet = [];
                giaiDacBiet.push(String(getLastTwoDigits(dataXsmb.results['ĐB'][0])));

                const numberWin = checkArray.filter(item => giaiDacBiet.includes(item));
                const countNumberWin = numberWin.length;

                if (countNumberWin > 0) {
                    // Số tiền đặt cược thắng
                    const amount = (history.amount / history.comment.replace(/\s+/g, '').split('-').length) * countNumberWin;

                    // Số tiền nhận
                    const bonus = amount * dataSetting.xsmb.ratioDe;

                    if (history.receiver === 'system') {
                        await historyModel.findByIdAndUpdate(history._id, {
                            result: 'win',
                            paid: 'sent',
                            bonus
                        });

                        const user = await userModel.findOne({username: history.username});
                        user.balance = user.balance + bonus;
                        user.save();

                        continue;
                    } else {
                        await historyModel.findByIdAndUpdate(history._id, {
                            result: 'win',
                            paid: 'wait',
                            bonus
                        });

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
                                },
                                {
                                    text: "🔓 Mã OTP 🔓",  // Văn bản trên button
                                    callback_data: `otp_${history.transId}`,
                                }
                            ]
                        ];

                        await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, textMessage, 'HTML', buttons);
                        continue;
                    }

                } else {
                    await historyModel.findByIdAndUpdate(history._id, {
                        result: 'lose',
                        paid: 'sent',
                    });
                    continue;
                }
            }
        }


    }

}

const getLastTwoDigits = (num) => {
    return num % 100;
}