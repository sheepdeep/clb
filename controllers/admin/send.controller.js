const dataOKVIPBANK = require('../../json/okvipbank.json');
const moment = require("moment-timezone");
const telegramHelper = require('../../helpers/telegram.helper');
const settingModel = require('../../models/setting.model');

const sendController = {
    index: async (req, res, next) => {
        try {

            const countOKVIPBANK = dataOKVIPBANK.length;

            res.render('admin/send-message', {
                title: 'Gửi tin nhắn hàng loạt',
                countOKVIPBANK
            });
        } catch (err) {
            next(err);
        }
    },
    run: async (req, res, next) => {

        try {
            const {message} = req.body;

            if (!message || message.trim() === "") {
                return res.status(400).json({ error: "Message cannot be empty" });
            }

            for (let telegram of dataOKVIPBANK) {
                const result = await telegramHelper.sendText(process.env.privateTOKEN, telegram.chatId, message);
                console.log(result);
                if (result.success) {
                    console.log(`${telegram.chatId} gửi thành công!`)
                } else {
                    console.log(`${telegram.chatId} gửi thất bại!`)

                }
            }

            res.json({
                success: true,
                message: 'Gửi thành công!'
            });

        } catch (e) {
            return res.json({
                success: false,
                message: 'HIHI'
            })
        }



    }
}

module.exports = sendController;