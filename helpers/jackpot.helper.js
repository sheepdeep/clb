const historyJackpot = require('../models/history-jackpot.model');
const transferModel = require('../models/transfer.model');
const settingModel = require('../models/setting.model');
const momoHelper = require('../helpers/momo.helper');
const logHelper = require('../helpers/log.helper');
const commentHelper = require('../helpers/comment.helper');
const momoService = require('../services/momo.service');

exports.checkWin = async (transId, numberTLS) => {
    try {
        let win;

        for (let i = 0; i < numberTLS.length; i++) {
            let number = String(numberTLS[i]);

            if (String(transId).slice(-number.length) == number) {
                win = !0;
                break;
            }
        }

        if (!win) return;


        return await this.jackpotCount(true);
    } catch (err) {
        console.log(err);
        return;
    }
}

exports.rewardJackpot = async (phoneActive, receiver, transId, amount) => {
    try {
        const dataSetting = await settingModel.findOne();
        let data = await historyJackpot.findOne({ receiver, transId });

        !data && await historyJackpot.findOneAndUpdate({ receiver, transId }, { $set: { receiver, transId, amount, status: 'wait' } }, { upsert: true });

        if (data && data.status != 'wait') {
            await logHelper.create('rewardJackpot', `Trả thưởng thất bại!\n* [ ${phone} | ${receiver} | ${transId} ]\n* [ Chỉ trả nổ hũ ở trạng thái đang xử lý! ]`);
            return;
        }

        let commentData = [
            {
                name: 'transId',
                value: transId,
            },
            {
                name: 'amount',
                value: Intl.NumberFormat('en-US').format(amount),
            }
        ];
        let comment = await commentHelper.dataComment(dataSetting.commentSite.rewardJackpot, commentData);

        if (!phoneActive) {
            let phoneActive = await momoService.phoneActive('all', amount);

            if (!phoneActive) {
                logHelper.create('rewardJackpot', `Trả thưởng thất bại!\n* [ ${receiver} | ${transId} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Không tìm thấy số nào đủ điều kiện để trả thưởng, vui lòng trả tay! ]`);
                return;
            }
        }

        if (await transferModel.findOne({ receiver, amount, comment })) {
            await logHelper.create('rewardJackpot', `Trả thưởng thất bại!\n* [ ${receiver} | ${transId} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Đã trả thưởng nổ hũ trước đó, không chuyển lại! ]`);
            await historyJackpot.findOneAndUpdate({ receiver, transId }, { $set: { status: 'success' } });
            return;
        }

        let transfer = await momoHelper.moneyTransfer(phoneActive, { phone: receiver, amount, comment });

        if (!transfer || !transfer.success) {
            await historyJackpot.findOneAndUpdate({ receiver, transId }, { $set: { status: 'error' } });
            await logHelper.create('rewardJackpot', `Trả thưởng thất bại!\n* [ ${receiver} | ${transId} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ ${transfer.message} ]`);
            return;
        }

        await historyJackpot.findOneAndUpdate({ receiver, transId }, { $set: { status: 'success' } });

        return ({
            transId,
            ...transfer.data
        });
    } catch (err) {
        console.log(err);
        await historyJackpot.findOneAndUpdate({ receiver, transId }, { $set: { status: 'error' } });
        await logHelper.create('rewardJackpot', `Trả thưởng thất bại!\n* [ ${receiver} | ${transId} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Có lỗi xảy ra ${err.message || err} ]`);
        return;
    }
}

exports.jackpotCount = async (reset) => {
    let dataSetting = await settingModel.findOne();
    reset && await settingModel.findOneAndUpdate({}, { $set: { jackpotCount: 0 } });
    return dataSetting ? dataSetting.jackpotCount : 0
}