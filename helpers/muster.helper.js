const moment = require('moment');
const sleep = require('time-sleep');
const settingModel = require('../models/setting.model');
const musterModel = require('../models/muster.model');
const transferModel = require('../models/transfer.model');
const musterService = require('../services/muster.service');
const momoService = require('../services/momo.service');
const momoHelper = require('../helpers/momo.helper');
const commentHelper = require('../helpers/comment.helper');
const logHelper = require('../helpers/log.helper');
const historyHelper = require('../helpers/utils.helper');


exports.runCron = async () => {
    try {
        let dataSetting = await settingModel.findOne();

        if (!dataSetting) {
            console.log('Hệ thống chưa setup, thử lại sau 60s!')
            await sleep(60 * 1000);
            return await this.runCron();
        }

        if (process.env.delayCronAuto == '') {
            console.log('\x1b[31m%s\x1b[0m', 'Trạng thái auto đang tắt!');
            await sleep(600 * 1000);
            return await this.runCron();
        }

        if (dataSetting.siteStatus != 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            await sleep(600 * 1000);
            return await this.runCron();
        }

        console.log('\x1b[32m%s\x1b[0m', `Tiến hành lấy mã giao dịch mới!, ${moment().format('YYYY-MM-DD HH:mm:ss')}`);

        let data = await historyHelper.runHistory();
        let hasHistory = Math.max(...data.map(item => item.count));
        console.log(data);

        if (hasHistory) {
            console.log('\x1b[32m%s\x1b[0m', `Tiến hành trả thưởng!, ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
            let reward = await historyHelper.runReward();
            console.log(reward);
        }
        console.log('Sleeping...', process.env.delayCronAuto);

        await sleep(process.env.delayCronAuto * 1000);
        return await this.runCron();
    } catch (err) {
        console.log(err);
        await sleep(60 * 1000);
        return await this.runCron();
    }
}

exports.run = async () => {
    try {
        const dataSetting = await settingModel.findOne();

        if (!dataSetting) {
            console.log('Hệ thống chưa setup, thử lại sau 60s!')
            await sleep(60 * 1000);
            return await this.run();
        }

        if (dataSetting.muster.status != 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Điểm danh đang tắt, thử lại sau 10 phút!');
            await sleep(600 * 1000);
            return await this.run();
        }

        if (moment().format('H') < dataSetting.muster.startTime || moment().format('H') > dataSetting.muster.endTime) {
            console.log('\x1b[31m%s\x1b[0m', 'Điểm danh đang tạm dừng, thử lại sau 10 phút!');
            await sleep(600 * 1000);
            return await this.run();
        }

        if (dataSetting.siteStatus != 'active') {
            console.log('\x1b[31m%s\x1b[0m', 'Website đang tạm bảo trì!');
            await sleep(600 * 1000);
            return await this.run();
        }

        let data = await musterModel.findOne({ status: 'active' }).sort({ createdAt: 'desc' });

        if (!data) {
            await new musterModel({
                code: Math.floor(100000 + Math.random() * 900000),
                timeDefault: dataSetting.muster.delay,
                status: 'active'
            }).save();

            socket.emit('musterData', await musterService.info());
            return await this.run();
        }

        let secondEnd = data.timeDefault - Math.abs((moment(data.createdAt).valueOf() - moment().valueOf()) / 1000).toFixed(0);

        if (secondEnd < 1) {
            let bonus = Math.floor(Math.random() * (dataSetting.muster.max - dataSetting.muster.min)) + dataSetting.muster.min;

            if (data.players.length < dataSetting.muster.limit) {
                return await musterModel.findByIdAndUpdate(data._id, { status: 'done' });
            }

            let winner = data.players[Math.floor(Math.random() * data.players.length)];

            data.win && (winner = data.win);
            console.log(`${winner} thắng điểm danh phiên ${data.code}`);

            await this.reward(data.code, winner, bonus);
            await musterModel.findByIdAndUpdate(data._id, { win: winner, amount: bonus, status: "done" });
            await musterModel.deleteMany({ status: "done", win: null });

            socket.emit("historyMuster", await musterService.getHistory(5));

        }

        return await sleep(3000), await this.run();
    } catch (err) {
        return console.log(err), await sleep(60 * 1000), await this.run()
    }
}

exports.reward = async (code, phone, amount) => {
    try {
        console.log(`Tiến hành trả thưởng điểm danh!, ${moment().format('YYYY-MM-DD HH:mm:ss')}`)

        const dataSetting = await settingModel.findOne();

        if (!dataSetting) {
            return;
        }

        let commentData = [
            {
                name: 'session',
                value: code,
            },
            {
                name: 'amount',
                value: Intl.NumberFormat('en-US').format(amount),
            }
        ];
        let comment = await commentHelper.dataComment(dataSetting.commentSite.rewardMuster, commentData);

        if (amount < 100) {
            return;
        }

        if (await transferModel.findOne({ receiver: phone, amount, comment })) {
            console.log(`#${code}, ${phone} đã được thưởng tiền điểm danh trước đó, bỏ qua!`);
            return;
        }

        let phoneRun = await momoService.phoneActive('all', amount);

        if (!phoneRun) {
            await logHelper.create('rewardMuster', `Trả thưởng điểm danh thất bại!\n* [ #${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Không có số nào đủ tiền để trả thưởng! ]`);
            return;
        }

        let transfer = await momoHelper.moneyTransfer(phoneRun, { phone, amount, comment });

        if (!transfer || !transfer.success) {
            await this.reward(code, phone, amount);
            return;
        }

        await logHelper.create('rewardMuster', `Trả thưởng điểm danh thành công!\n* [ #${code} | ${Intl.NumberFormat('en-US').format(amount)} ]`);
    } catch (err) {
        console.log(err);
        await logHelper.create('rewardMuster', `Trả thưởng điểm danh thất bại!\n* [ #${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ ${err.message || err} ]`);
        return;
    }
}