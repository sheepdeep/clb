const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const zaloHelper = require('./helpers/zalo.helper');
const logHelper = require("./helpers/log.helper");
const oldBank = require('./json/bank.json');

if (isMainThread) {
    const dotenv = require('dotenv');
    dotenv.config({ path: './configs/config.env' });
    const { connectDB } = require('./configs/database');
    const zaloModel = require('./models/zalo.model');

    connectDB().then(async () => {
        console.log('✅ Kết nối DB thành công');

        const zalos = await zaloModel.find({ status: 'active' }).limit(5).lean();

        if (zalos.length === 0) {
            console.log('❗Không có tài khoản nào.');
            return;
        }

        zalos.forEach((zalo, index) => {
            const worker = new Worker(__filename, {
                workerData: zalo,
            });

            worker.on('message', msg => {
                if (msg.error) {
                    console.error(`❌ Worker ${index} lỗi:`, msg.message);
                    return;
                }
                console.log(`✅ Worker ${index} trả về:`, msg);
            });

            worker.on('error', err => {
                console.error(`❌ Worker ${index} gặp lỗi:`, err);
            });

            worker.on('exit', code => {
                if (code !== 0)
                    console.log(`⚠️ Worker ${index} thoát với mã lỗi ${code}`);
            });
        });

    }).catch(err => {
        console.error('❌ Kết nối DB thất bại:', err.message);
    });

} else {
    // WORKER THREAD
    (async () => {
        const dotenv = require('dotenv');
        dotenv.config({ path: './configs/config.env' });
        const { connectDB } = require('./configs/database');
        connectDB();
        const zaloHelper = require('./helpers/zalo.helper');
        const historyModel = require('./models/history.model');
        const telegramHelper = require('./helpers/telegram.helper');
        const userModel = require('./models/user.model');

        const zalo = workerData;

        try {
            const history = await historyModel.findOne({transfer: zalo.phone}).lean();

            if (!history) {
                parentPort.postMessage({error: true, zalo: zalo.phone, message: 'Không thấy đơn để chuyển tiền!'});
                return process.exit(1);
            }

            const dataBalance = await zaloHelper.balance(zalo.phone);

            if (dataBalance.balance < history.bonus) {
                parentPort.postMessage({ error: true, zalo: zalo.phone, message: '❌ Hết tiền trả thưởng!' });
                await telegramHelper.sendText(process.env.privateTOKEN, process.env.privateID, `${zalo.phone} [Hết tiền trả thưởng]`);
                return process.exit(1);
            }

            const user = await userModel.findOne({ username: history.username });
            if (!user || !user.bankInfo) {
                parentPort.postMessage({ error: true, zalo: zalo.phone, message: '❌ Không tìm thấy thông tin ngân hàng của user!' });
                return process.exit(1);
            }

            const checkBank = oldBank.data.find(bank => bank.bin === user.bankInfo.bankCode);
            if (!checkBank) {
                parentPort.postMessage({ error: true, zalo: zalo.phone, message: `❌ Không tìm thấy bankCode: ${user.bankInfo.bankCode}` });
                return process.exit(1);
            }

            const dataTransfer = {
                accountNumber: user.bankInfo.accountNumber,
                bankCode: checkBank.shortName,
                bankName: checkBank.shortName,
                amount: String(history.bonus),
                comment: 'hoan tien tiktok ' + String(history.transId).slice(-4)
            };

            const resultTransfer = await zaloHelper.sendMoneyBank(zalo.phone, dataTransfer);

            const result = {
                zaloId: zalo.phone,
                balance: dataBalance.balance,
                transferResult: resultTransfer,
            };

            parentPort.postMessage(result);


        } catch (err) {
            parentPort.postMessage({
                error: true,
                zaloId: zalo?.phone,
                message: err.message
            });
        }
    })();
}
