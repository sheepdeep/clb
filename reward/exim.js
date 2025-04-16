const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const eximHelper = require("../helpers/eximbank.helper");
const sleep = require("time-sleep");
const eximbankHelper = require("../helpers/eximbank.helper");
const bankModel = require("../models/bank.model");
const telegramHelper = require("../helpers/telegram.helper");
const transferModel = require("../models/transfer.model");
const historyModel = require("../models/history.model");

if (isMainThread) {
    const dotenv = require('dotenv');
    dotenv.config({ path: '../configs/config.env' });
    const { connectDB } = require('../configs/database');
    const bankModel = require('../models/bank.model');

    connectDB().then(async () => {
        console.log('✅ Kết nối DB thành công');

        const startWorkers = async () => {
            const banks = await bankModel.find({status: 'active', bankType: 'exim', reward: false}).limit(5).lean();

            if (banks.length === 0) {
                console.log('❗Không có tài khoản nào.');
                await sleep(3000);
                await startWorkers();
                return;
            }

            const workerPromises = banks.map((bank, index) => {
                return new Promise((resolve) => {
                    const worker = new Worker(__filename, {
                        workerData: bank,
                    });

                    worker.on('message', msg => {
                        if (msg.error) {
                            console.error(`❌ Worker ${msg.accountNumber} lỗi:`, msg.message);
                        } else {
                            console.log(`✅ Worker ${msg.accountNumber}:`, msg.message);
                        }
                    });

                    worker.on('error', err => {
                        console.error(`❌ Worker ${index} gặp lỗi:`, err);
                    });

                    worker.on('exit', code => {
                        if (code !== 0)
                            console.log(`⚠️ Worker ${index} thoát với mã lỗi ${code}`);
                        resolve(); // Kết thúc promise khi worker kết thúc
                    });
                });
            });

            await Promise.all(workerPromises);

            console.log('✅ Tất cả worker hoàn thành, chờ 3 giây rồi chạy tiếp...');
            await sleep(3000);
            await startWorkers(); // Chạy lại sau delay
        }

        startWorkers();

    }).catch(err => {
        console.error('❌ Kết nối DB thất bại:', err.message);
    });

} else {
    // WORKER THREAD
    (async () => {
        const dotenv = require('dotenv');
        dotenv.config({ path: '../configs/config.env' });
        const { connectDB } = require('../configs/database');
        connectDB();
        const eximHelper = require('../helpers/eximbank.helper');
        const historyModel = require('../models/history.model');
        const telegramHelper = require('../helpers/telegram.helper');
        const bankModel = require('../models/bank.model');
        const userModel = require('../models/user.model');
        const sleep = require("time-sleep");
        const transferModel = require('../models/transfer.model');
        const oldBank = require('../json/bank.json');

        const dataBank = workerData;

        try {
            const history = await historyModel.findOne({transfer: dataBank.accountNumber, paid: 'wait'}).lean();

            if (!history) {
                parentPort.postMessage({error: true, accountNumber: dataBank.accountNumber, message: 'Không thấy đơn để chuyển tiền!'});
                return process.exit(1);
            }

            const checkTrans = await transferModel.findOne({transId: history.transId}).lean();

            if (checkTrans) {
                await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {paid: 'sent'}});
                parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: '❌ Đơn đã được trả thưởng!' });
                return process.exit(1);
            }

            await bankModel.findOneAndUpdate({accountNumber: dataBank.accountNumber}, {$set: {reward: true}});

            const resultBalance = await eximHelper.getBalance(dataBank.accountNumber, dataBank.bankType);

            if (!resultBalance.success) {
                parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: '❌ Hết thời gian đăng nhập!' });
                return process.exit(1);
            }

            if (resultBalance) {
                parentPort.postMessage({ accountNumber: dataBank.accountNumber, message: `💰 ${dataBank.accountNumber} ${Intl.NumberFormat('en-US').format(resultBalance.resultDecode.data.totalCurrentAmount || 0)} VNĐ` });
            }

            if ((resultBalance.resultDecode.data.totalCurrentAmount - 50000) < history.bonus) {
                await bankModel.findOneAndUpdate({accountNumber: dataBank.accountNumber}, {$set: {reward: false, otp: null, status: 'pending'}});
                parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: '❌ Hết tiền trả thưởng!' });
                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `Eximbank [${dataBank.accountNumber}] [Hết tiền trả thưởng]`);
                return process.exit(1);
            }

            const user = await userModel.findOne({ username: history.username });
            if (!user || !user.bankInfo) {
                await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {paid: 'bankerror'}});
                await bankModel.findOneAndUpdate({accountNumber: dataBank.accountNumber}, {$set: {reward: false, otp: null}});
                parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: '❌ Không tìm thấy thông tin ngân hàng của user!' });
                return process.exit(1);
            }

            const checkBank = oldBank.data.find(bank => bank.bin === user.bankInfo.bankCode);
            if (!checkBank) {
                parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: `❌ Không tìm thấy bankCode` });
                return process.exit(1);
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

            if (resultInitTransfer.success) {
                parentPort.postMessage({ accountNumber: dataBank.accountNumber, message: `💸 Tạo hoá đơn chuyển tiền đến ${user.bankInfo.accountNumber} với số tiền ${Intl.NumberFormat('en-US').format(history.bonus || 0)} VNĐ!` });
                parentPort.postMessage({ accountNumber: dataBank.accountNumber, message: `💸 Đang đợi mã OTP để thực hiện chuyển tiền!` });
                let limitTransfer = 0, checkOTPTransfer = true;

                while (checkOTPTransfer) {
                    const newDataBank = await bankModel.findOne({accountNumber: dataBank.accountNumber}).lean();
                    limitTransfer++
                    await sleep(2000);
                    if (limitTransfer === 10) {
                        parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: `💸 Không thấy mã OTP!` });
                        return process.exit(1);
                    }

                    if (newDataBank.otp) {
                        parentPort.postMessage({ accountNumber: dataBank.accountNumber, message: `💸 Đã thấy OTP thực hiện xác thực chuyển tiền - OTP [${newDataBank.otp}]!` });
                        const result = await eximbankHelper.verifyTransfer(dataBank.accountNumber, dataBank.bankType, newDataBank.otp);
                        if (result.resultDecode.code === '00') {
                            await historyModel.findOneAndUpdate({transId: history.transId}, {$set: {paid: 'sent'}});
                            await userModel.findOneAndUpdate({username: history.username}, {$set: {"bankInfo.guard": true}});
                            await new transferModel({
                                transId: history.transId,
                                receiver: user.bankInfo.accountNumber,
                                transfer: dataBank.accountNumber,
                                username: history.username,
                                firstMoney: resultBalance.resultDecode.data.totalCurrentAmount,
                                amount: history.bonus,
                                lastMoney: resultBalance.resultDecode.data.totalCurrentAmount - history.bonus,
                                comment: 'hoan tien tiktok ' + String(history.transId).slice(-4),
                            }).save();
                            parentPort.postMessage({ accountNumber: dataBank.accountNumber, message: `💸 Thực hiện đơn #${history.transId} thành công!` });
                            return process.exit(1);
                        } else {
                            parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: `💸 ${result.message}` });
                            return process.exit(1);
                        }
                    }
                }
            } else {
                await bankModel.findOneAndUpdate({accountNumber: dataBank.accountNumber}, {$set: {reward: false, otp: null}});
                parentPort.postMessage({ error: true, accountNumber: dataBank.accountNumber, message: `💸 Lỗi tạo đơn với số tiền ${Intl.NumberFormat('en-US').format(history.bonus || 0)} VNĐ!` });
                return process.exit(1);
            }



        } catch (err) {
            parentPort.postMessage({
                error: true,
                zaloId: dataBank?.accountNumber,
                message: err.message
            });
        }
    })();
}
