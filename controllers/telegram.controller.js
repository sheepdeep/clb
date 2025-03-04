const telegramHelper = require('../helpers/telegram.helper');
const userModel = require("../models/user.model");
const historyModel = require('../models/history.model');
const settingModel = require('../models/setting.model');
const securityHelper = require("../helpers/security.helper");
const axios = require("axios");
const ncbHelper = require('../helpers/ncb.helper');
const commentHelper = require("../helpers/comment.helper");
const bankModel = require("../models/bank.model");
const moment = require("moment/moment");
const transferModel = require('../models/transfer.model');


const telegramController = {
    hook: async (req, res, next) => {

        try {
            let dataSetting = await settingModel.findOne();
            const update = req.body;

            console.log(update);

            // Kiểm tra nếu có tin nhắn mới
            if (update.message) {

                const chatId = update.message.chat.id;
                const text = update.message.text;
                let message;
                const dataText = text?.split(' ');

                const command = dataText[0];
                const comment = dataText[1];

                console.log(command);

                if (command == '/start') {

                    const username = Buffer.from(comment, 'base64').toString('utf8');
                    const user = await userModel.findOne({username});

                    console.log(user);

                    if (!user) {
                        message = `❌ Tài khoản không có trong hệ thống!`;
                    } else if (user.telegram?.status == 'active') {
                        message = `❌ Tài khoản đã được liên kết!`;
                    } else if (await userModel.findOne({"telegram.chatId": chatId}).lean()) {
                        message = `❌ Tài khoản telegram đã được liên kết trước đó!`;
                    } else {
                        await userModel.findOneAndUpdate({username}, {
                            $set: {
                                "telegram.chatId": chatId,
                                "telegram.status": "active"
                            }
                        })

                        message = `✅ Tài khoản liên kết thành công!`;
                    }
                }

                if (comment == '/otp') {

                }

                return res.json(await telegramHelper.sendText(process.env.privateTOKEN, chatId, message));
            }

            return res.json({
                success: false,
                message: 'Gửi thất bại'
            })
        } catch (e) {
            return res.json({
                success: false,
                message: 'Gửi thất bại'
            })
        }

    },
}

module.exports = telegramController;