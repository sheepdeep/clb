const TelegramBot = require('node-telegram-bot-api');
const axios = require("axios");
const cheerio = require('cheerio');
const rewardModel = require('../models/reward.model');
const historyModel = require('../models/history.model');
const sleep = require("time-sleep");
const giftModel = require('../models/gift.model');
const moment = require("moment/moment");
const telegramHelper = require("../helpers/telegram.helper");
const settingModel = require('../models/setting.model');

exports.connectBot = async () => {
    try {
        console.log('Khởi động bot telegram');

        const bot = new TelegramBot(process.env.privateTOKEN, {polling: true});

        bot.onText(/\/echo (.+)/, (msg, match) => {

            const chatId = msg.chat.id;
            const resp = match[1];

            bot.sendMessage(chatId, resp);
        });

        bot.on('text', async (msg) => {
            let chatId = msg.chat.id;
            let message = msg.text;

            const comment = message.split(' ');


            if (message === '/alomomo') {
                const welcomeMessage = `
Chào mừng bạn đến với ALOMOMO.ME!

Đây là mini Game Telegram được phát hành bởi ALOMOMO.ME. Bạn có thể chơi AloMomo trực tiếp trên APP TELEGRAM (https://t.me/alomomome_bot)

Chúc bạn chơi game vui vẻ!!!`;


                bot.sendMessage(chatId, welcomeMessage);
            }

            if (message === '/lienket' || comment[0]  === '/lienket') {

                const string = message.split(' ');
                let lienketMessage;

                console.log(string.length);

                if (string.length < 2) {
                    // Nếu không có đủ tham số (số điện thoại hoặc người giới thiệu), gửi tin nhắn chào mừng
                    lienketMessage = `
Chào mừng bạn đến với ALOMOMO.ME!

Vui lòng nhập /lienket {sodienthoai} {nguoigioithieu} nếu có người giới thiệu xin hãy nhập để tăng 10% giftcode

Chúc bạn chơi game vui vẻ!!!`;
                } else {
                    const phone = string[1];
                    const nguoigioithieu = string[2] || 'Không có người giới thiệu';  // Nếu không có người giới thiệu, gán mặc định

                    lienketMessage = `Số điện thoại: ${phone}\nNgười giới thiệu: ${nguoigioithieu}`;
                }

                if (lienketMessage.trim() !== '') {  // Kiểm tra xem lienketMessage có phải là chuỗi rỗng không
                    bot.sendMessage(chatId, lienketMessage);
                } else {
                    console.log('Tin nhắn không hợp lệ, không gửi đi.');
                }
            }


            if (message === '/xsmb') {

                const dataXSMB = await this.getXSMBToday();
                let number = dataXSMB.results.join(' - ');
                await rewardModel.findOneAndUpdate({gameType: 'XSMB_Game'}, {
                    $set:
                        {
                            content: 99,
                            gameType: 'XSMB_Game',
                            resultType: 'end',
                            amount: 3.4,
                            numberTLS: number.replace(/\s+/g, '').split('-').filter(item => item)
                        }
                }, {upsert: true});

                bot.sendMessage(chatId, 'Hệ thống bắt đầu cập nhật XSMB ngày ' + dataXSMB.time + ' \n  🏆 Kết quả là [' + number + ']');

            }

            if (message.toLowerCase() === 'phán' || message.toLowerCase() === 'phan') {
                const randomReward = await rewardModel.aggregate([
                    { $sample: { size: 1 } }
                ]);
                console.log(randomReward[0]);

                bot.sendMessage(chatId, '😘 Bạn có duyên tiền định với ' + randomReward[0].content + '\n🏆 KẾT QUẢ: ' + randomReward[0].numberTLS.join(' - '));
            }

        });
    } catch (err) {
        console.log(err);
    }
}

exports.randomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }

    return result;
}

exports.deleteOrder = async () => {
    try {

        const dataSetting = await settingModel.findOne({});

        const gifts = await giftModel.findOne({type: 'bot'}).sort({ _id: -1 }).lean();
        const code = 'ALOMOMO' + await this.randomString(5);

        if (dataSetting.giftDay.status === 'active') {
            if (!gifts) {
                let newGift = await new giftModel({
                    code,
                    amount: Math.floor(Math.random() * (parseInt(dataSetting.giftDay.max) - parseInt(dataSetting.giftDay.min) + 1) + parseInt(dataSetting.giftDay.min)),
                    limit: 1,
                    playCount: parseInt(dataSetting.giftDay.playCount),
                    expiredAt: moment().add(1, 'days').toDate(),
                    type: 'bot'
                }).save();

                const message = `<b>📣📣 ALOMOMO.ME xin tặng giftcode ngẫu nhiên: ${code}.</b> \n

<em>(lưu ý: giftcode được nhận ngẫu nhiên trong ngày và chỉ nhập được một lần cho ai nhanh nhất. giá trị code nhận thêm 50% nếu bạn làm <a href="https://alomomo.me/">NHIỆM VỤ ALOMOMO</a>)</em> \n 
<b>Truy cập <a href="https://alomomo.me/"> ALOMOMO.ME </a> để trải nghiệm</b>`;

                const buttons = [
                    [
                        {
                            text: "🕹 Chơi ngày 🕹",  // Văn bản trên button
                            url: "https://www.alomomo.me"
                        }
                    ]
                ];

                telegramHelper.sendText(
                    dataSetting.telegram.token,       // Token của bot Telegram
                    dataSetting.giftDay.chatId,      // Chat ID để gửi tin nhắn
                    message,                          // Nội dung tin nhắn (HTML)
                    'HTML',                           // Chế độ định dạng là HTML
                    buttons                           // Các nút bấm
                );

                await sleep(1 * 1000);
                return await this.deleteOrder();
            }

            let time = Math.floor(Math.random() * (parseInt(dataSetting.giftDay.timeMax) - parseInt(dataSetting.giftDay.timeMin) + 1) + parseInt(dataSetting.giftDay.timeMin)) * 60000;

            const elapsedTime = Date.now() - gifts.createdAt;

            if (elapsedTime >= time) {
                let newGift = await new giftModel({
                    code,
                    amount: Math.floor(Math.random() * (parseInt(dataSetting.giftDay.max) - parseInt(dataSetting.giftDay.min) + 1) + parseInt(dataSetting.giftDay.min)),
                    limit: 1,
                    playCount: parseInt(dataSetting.giftDay.playCount),
                    expiredAt: moment().add(1, 'days').toDate(),
                    type: 'bot'
                }).save();

                const message = `<b>📣📣 ALOMOMO.ME xin tặng giftcode ngẫu nhiên: ${code}.</b> \n

<em>(lưu ý: giftcode được nhận ngẫu nhiên trong ngày và chỉ nhập được một lần cho ai nhanh nhất. giá trị code nhận thêm 50% nếu bạn làm <a href="https://alomomo.me/">NHIỆM VỤ ALOMOMO</a>)</em> \n 
<b>Truy cập <a href="https://alomomo.me/"> ALOMOMO.ME </a> để trải nghiệm</b>`;

                const buttons = [
                    [
                        {
                            text: "🕹 Chơi ngày 🕹",  // Văn bản trên button
                            url: "https://www.alomomo.me"
                        }
                    ]
                ];

                telegramHelper.sendText(
                    dataSetting.telegram.token,       // Token của bot Telegram
                    dataSetting.giftDay.chatId,      // Chat ID để gửi tin nhắn
                    message,                          // Nội dung tin nhắn (HTML)
                    'HTML',                           // Chế độ định dạng là HTML
                    buttons                           // Các nút bấm
                );
            }

            await sleep(1 * 1000);
            return await this.deleteOrder();
        }

        const orders = await historyModel.find({status: 'waitTransfer'}).lean();
        for (let order of orders) {
            const elapsedTime = Date.now() - order.createdAt;
            if (elapsedTime >= 30000) {  // Nếu đã quá 30 giây
                await historyModel.findByIdAndDelete(order._id);
                await sleep(1 * 1000);
                console.log(`Đơn hàng ${order._id} đã bị xóa sau 30 giây.`);
                return await this.deleteOrder();
            } else {
                await sleep(1 * 1000);
                return await this.deleteOrder();
            }
        }
        return await this.deleteOrder();
    } catch (e) {
        console.log(e);
    }
}
