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
            if (update.message && !update.message.reply_to_message) {

                const chatId = update.message.chat.id;
                const text = update.message.text;
                let message;
                const dataText = text?.split(' ');

                const command = dataText[0];
                const comment = dataText[1];

                if (command == '/start') {

                    const username = Buffer.from(comment, 'base64').toString('utf8');
                    const user = await userModel.findOne({username});

                    if (!user) {
                        message = `❌ Tài khoản không có trong hệ thống!`;
                    } else if (user.telegram.status == 'active') {
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

                return res.json(await telegramHelper.sendText(process.env.privateTOKEN, chatId, message, 'HTML'));
            }

            if (update.callback_query) {
                const typeReq = update.callback_query.data;
                const type = typeReq.split('_')[0];
                const transId = typeReq.split('_')[1];

                const chatId = update.callback_query.from.id;
                const messageId = update.callback_query.message.message_id;

                if (await transferModel.findOne({transId})) {
                    await telegramHelper.deleteText(process.env.privateTOKEN, chatId, messageId);
                    let textMessage = `Trả thưởng MGD #${transId} đã được trả thưởng!`;
                    return res.json(await telegramHelper.sendText(process.env.privateTOKEN, chatId, textMessage, 'HTML'));
                }

                if (type == 'done') {
                    await telegramHelper.deleteText(process.env.privateTOKEN, chatId, messageId);

                    let textMessage = `Trả thưởng MGD ${transId} thành công!`;

                    const dataHistory = await historyModel.findOne({transId});

                    // const allHistories = await historyModel.find({status})

                    if (dataHistory) {
                        let histories = await historyModel.find({username: dataHistory.username}, {
                            _id: 0,
                            transId: 1,
                            amount: 1,
                            comment: 1,
                            gameType: 1,
                            result: 1,
                            paid: 1,
                            description: 1,
                            createdAt: 1,
                            isCheck: 1
                        }).sort({createdAt: -1}).limit(10).lean();

                        let dataPost = {
                            success: true,
                            username: dataHistory.username,
                            histories
                        };

                        await historyModel.findOneAndUpdate({transId}, {
                                $set: {
                                    paid: 'sent',
                                }
                            }
                        )

                        let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

                        socket.emit('cltx', dataEncode);
                    }

                    return res.json(await telegramHelper.sendText(process.env.privateTOKEN, chatId, textMessage, 'HTML'));
                }

                if (type == 'otp') {

                    await telegramHelper.deleteText(process.env.privateTOKEN, chatId, messageId);

                    let history = await historyModel.findOne({transId}).lean();
                    let user = await userModel.findOne({username: history.username}).lean();

                    let commentData = [
                        {
                            name: 'transId',
                            value: history.transId,
                        },
                        {
                            name: 'comment',
                            value: history.comment,
                        },
                        {
                            name: 'amount',
                            value: history.amount,
                        },
                        {
                            name: 'bonus',
                            value: history.bonus,
                        }

                    ];
                    let rewardComment = await commentHelper.dataComment(dataSetting.commentSite.rewardGD, commentData);

                    const bank = await bankModel.findOne({bankType: 'ncb', status: 'active'}).lean();

                    await ncbHelper.confirm(
                        {
                            bankCode: user.bankInfo.bankCode,
                            accountNumber: user.bankInfo.accountNumber,
                            amount: history.bonus,
                            comment: rewardComment,
                            name: user.bankInfo.accountName
                        },
                        bank.accountNumber,
                        bank.bankType,
                        history
                    );

                    await axios.post(`https://api.telegram.org/bot${process.env.privateTOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `Vui lòng nhập mã OTP #${transId}`,
                        reply_markup: JSON.stringify({
                            force_reply: true // Forces the user to reply directly to this message
                        })
                    });

                    return res.json({
                        success: true,
                        message: 'Gửi thất bại'
                    })
                }

            }

            if (update.message.reply_to_message) {

                const chatId = update.message.chat.id;
                const text = update.message.text;

                const regex = /#(\w+)/;
                const transId = update.message.reply_to_message.text.match(regex)[1];

                let history = await historyModel.findOne({transId}).lean();
                let user = await userModel.findOne({username: history.username}).lean();
                await telegramHelper.sendText(process.env.privateTOKEN, chatId, `Mã OTP ${text} đang được xác thực cho #${transId}`, 'HTML');

                if (await transferModel.findOne({transId})) {
                    await telegramHelper.deleteText(process.env.privateTOKEN, chatId, messageId);
                    let textMessage = `Trả thưởng MGD #${transId} đã được trả thưởng!`;
                    return res.json(await telegramHelper.sendText(process.env.privateTOKEN, chatId, textMessage, 'HTML'));
                }

                let commentData = [
                    {
                        name: 'transId',
                        value: history.transId,
                    },
                    {
                        name: 'comment',
                        value: history.comment,
                    },
                    {
                        name: 'amount',
                        value: history.amount,
                    },
                    {
                        name: 'bonus',
                        value: history.bonus,
                    }

                ];
                let rewardComment = await commentHelper.dataComment(dataSetting.commentSite.rewardGD, commentData);
                const bank = await bankModel.findOne({bankType: 'ncb', status: 'active'}).lean();

                let result = await ncbHelper.verify(
                    { bankCode: user.bankInfo.bankCode, accountNumber: user.bankInfo.accountNumber, amount: history.bonus, comment: rewardComment, name: user.bankInfo.accountName },
                    bank.accountNumber,
                    bank.bankType,
                    text,
                    transId
                )

                if (result.code == 200) {

                    let histories = await historyModel.find({username: history.username}, {
                        _id: 0,
                        transId: 1,
                        amount: 1,
                        comment: 1,
                        gameType: 1,
                        result: 1,
                        paid: 1,
                        description: 1,
                        createdAt: 1,
                        isCheck: 1
                    }).sort({createdAt: -1}).limit(10).lean();

                    let historys = await historyModel.find({status: 'win'}).sort({createdAt: 'desc'}).limit(5);
                    let list = [];

                    for (const history of historys) {
                        list.push({
                            username: `${history.username.slice(0, 4)}****`,
                            amount: history.amount,
                            bonus: history.bonus,
                            gameName: history.gameName,
                            comment: history.comment,
                            result: history.result,
                            time: moment(history.timeTLS).format('YYYY-MM-DD HH:mm:ss')
                        })
                    }

                    await historyModel.findOneAndUpdate({transId}, {
                            $set: {
                                paid: 'sent',
                            }
                        }
                    )

                    let dataPost = {
                        success: true,
                        username: user.username,
                        histories,
                        allHistories: list
                    };

                    let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

                    socket.emit('cltx', dataEncode);

                    let textMessage = `Trả thưởng MGD ${transId} thành công!`;

                    await telegramHelper.sendText(process.env.privateTOKEN, chatId, textMessage, 'HTML');
                }

                return res.json({
                    success: true,
                    message: 'thanh cong'
                });

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