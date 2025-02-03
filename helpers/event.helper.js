const settingModel = require("../models/setting.model");
const historyEventModel = require("../models/history-event.model");
const logHelper = require("./log.helper");
const moment = require("moment/moment");
const commentHelper = require("./comment.helper");
const momoService = require("../services/momo.service");
const transferModel = require("../models/transfer.model");
const momoHelper = require("./momo.helper");
const telegramHelper = require('../helpers/telegram.helper');
const momoModel = require('../models/bank.model');

exports.rewardWheel = async (phone, code, amount) => {
    try {
        let dataSetting = await settingModel.findOne();
        let data = await historyEventModel.findOne({ code, status: 'wait' }).lean();

        if (!data) {
            logHelper.create('rewardGift', `Trả thưởng thất bại!\n* [ ${phone} | ${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Mã code này đã hết hạn sử dụng hoặc không tồn tại! ]`);
            return;
        }

        if (data.transId) {
            console.log(`[ ${phone} | ${code} | ${Intl.NumberFormat('en-US').format(amount)} ], đã nhận thưởng mã code này rồi!`);
            return;
        }

        await historyEventModel.findOneAndUpdate({ code, status: 'wait' }, {$set: {status: 'success'}});

        let commentData = [
            {
                name: 'code',
                value: code,
            },
            {
                name: 'amount',
                value: Intl.NumberFormat('en-US').format(data.amount),
            }
        ];
        let comment = await commentHelper.dataComment(dataSetting.commentSite.rewardWheel, commentData);
        let dataMomo = await momoModel.findOne({transfer: true, loginStatus: 'active', status: 'active'}).lean();

        if (!dataMomo) {
            logHelper.create('rewardGift', `Trả thưởng thất bại!\n* [ ${phone} | ${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Không tìm thấy số nào đủ điều kiện để trả thưởng, vui lòng trả tay! ]`);
            return;
        }

        if (await transferModel.findOne({ receiver: phone, amount, comment }) || amount < 100) {
            console.log(`[ ${phone} | ${code} | ${amount} ], đã nhận thưởng mã code này từ trước rồi!`)
            logHelper.create('rewardGift', `Trả thưởng thất bại!\n* [ ${phone} | ${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Đã nhận thưởng mã code này từ trước rồi! ]`);
            return;
        }

        let transfer = await momoHelper.moneyTransfer(dataMomo.phone, { phone, amount, comment });

        const message = `📣📣 ALOMOMO.ME Thông báo \n 🎖🎖 Chúc mừng ${phone.slice(0, -6)}****** đã nhập được ${Intl.NumberFormat('en-US').format(amount)} vnđ từ <a href="https://www.alomomo.me/wheel">VÒNG QUAY</a>`;

        const buttons = [
            [
                {
                    text: "🕹 Chơi ngày 🕹",  // Văn bản trên button
                    url: "https://www.alomomo.me"
                }
            ]
        ];

        telegramHelper.sendText(dataSetting.telegram.token, dataSetting.telegram.chatId, message, 'HTML', buttons)

        if (!transfer || !transfer.success) {
            logHelper.create('rewardGift', `Trả thưởng thất bại!\n* [ ${phone} | ${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ ${transfer.message} ]`)
            return await this.rewardWheel(phone, code);
        }

        logHelper.create('rewardGift', `Trả thưởng thành công!\n* [ ${phone} | ${code} | ${Intl.NumberFormat('en-US').format(amount)} ]\n* [ Mã giao dịch: ${transfer.data.transId} ]`)
    } catch (err) {
        console.log(err);
        logHelper.create('rewardGift', `Trả thưởng thất bại!\n* [ ${phone} | ${code} ]\n* [ ${err.message || err}, vui lòng trả tay! ]`);
        return;
    }
}
