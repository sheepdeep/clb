"use strict";
const axios = require("axios");
const userModel = require("../models/user.model");
const settingModel = require("../models/setting.model");
const historyModel = require('../models/history.model');
const securityHelper = require('../helpers/security.helper');
const {HttpsProxyAgent} = require('https-proxy-agent');

module.exports = {
    sendText: async (token, chatID, message, parseMode = 'HTML', buttons = []) => {
        try {

            // const proxyUrl = 'http://user49033:0acDKxjSmq@36.50.26.110:49033';

            // const agent = new HttpsProxyAgent(proxyUrl);

            let options = {
                method: 'POST',
                url: `https://api.telegram.org/bot${token}/sendMessage`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                // httpsAgent: agent,
                data: `chat_id=${chatID}&text=${message}&parse_mode=${parseMode}&reply_markup=${JSON.stringify({ inline_keyboard: buttons })}`
            };

            let { data: response } = await axios(options);

            return response.ok ? ({
                success: true,
                message: 'Gửi thành công!',
                response
            }) : ({
                success: false,
                message: 'Gửi thất bại!'
            })
        } catch (err) {
            return ({
                success: false,
                message: 'Có lỗi xảy ra, ' + err.message || err
            })
        }
    },
    sendPhoto: async (token, chatID, message, image, parseMode = 'HTML') => {
        try {

            // const proxyUrl = 'http://user49033:0acDKxjSmq@36.50.26.110:49033'; // Replace with your proxy and credentials

            const agent = new HttpsProxyAgent(proxyUrl);

            let options = {
                method: 'POST',
                url: `https://api.telegram.org/bot${token}/sendPhoto`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                // httpsAgent: agent,
                data: `chat_id=${chatID}&photo=${image}&caption=${message}&parse_mode=${parseMode}`
            };

            let { data: response } = await axios(options);

            console.log(response);

            return response.ok ? ({
                success: true,
                message: 'Gửi thành công!'
            }) : ({
                success: false,
                message: 'Gửi thất bại!'
            })
        } catch (err) {
            return ({
                success: false,
                message: 'Có lỗi xảy ra, ' + err.message || err
            })
        }
    },
    deleteText: async (token, chatID, message) => {
        try {
            let options = {
                method: 'POST',
                url: `https://api.telegram.org/bot${token}/deleteMessage`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: `chat_id=${chatID}&message_id=${message}`
            };

            let { data: response } = await axios(options);

            return response.ok ? ({
                success: true,
                message: 'Gửi thành công!'
            }) : ({
                success: false,
                message: 'Gửi thất bại!'
            })
        } catch (err) {
            return ({
                success: false,
                message: 'Có lỗi xảy ra, ' + err.message || err
            })
        }
    },
    sendDice: async (token, chatID) => {
        try {

            // const proxyUrl = 'http://user49033:0acDKxjSmq@36.50.26.110:49033'; // Replace with your proxy and credentials
            // const agent = new HttpsProxyAgent(proxyUrl);

            let options = {
                method: 'POST',
                url: `https://api.telegram.org/bot${token}/sendDice`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                // httpsAgent: agent,
                data: `chat_id=${chatID}`
            };

            let { data: response } = await axios(options);

            return response.ok ? ({
                success: true,
                message: 'Gửi thành công!',
                data: response
            }) : ({
                success: false,
                message: 'Gửi thất bại!'
            })
        } catch (err) {
            return ({
                success: false,
                message: 'Có lỗi xảy ra, ' + err.message || err
            })
        }
    },
    cltx: async (username, amount, comment, historyOld) => {
        try {
            const dataSetting = await settingModel.findOne({});
            const user = await userModel.findOne({username});

            let status;
            let balance = user.balance - amount;

            let result = await module.exports.sendDice(dataSetting.telegram.token, user.telegram.chatId);
            let dice = result.data.result.dice.value;

            const history = await historyModel.findOne({transId: historyOld.transId});

            let desc = `${history.description} WIN -&gt; (SB: ${Intl.NumberFormat("en-US").format(user.balance)} -&gt; ${Intl.NumberFormat("en-US").format(balance + amount * 1.9)})`

            let message = 'lose';
            let numberString  = (amount * 1.9).toString();

            if (dice > 3 && comment == 'T') {
                balance = balance + (amount * 1.9); await user.save();
                status = 'win';
            } else if(dice <= 3 && comment == 'X') {
                balance = balance + (amount * 1.9); await user.save();
                status = 'win';
            } else if (dice == 2 && comment == 'C' || dice == 4 && comment == 'C' || dice == 6 && comment == 'C') {
                balance = balance + (amount * 1.9);
                status = 'win';
            } else if (dice == 1 && comment == 'L' || dice == 3 && comment == 'L' || dice == 5 && comment == 'L') {
                balance = balance + (amount * 1.9);
                status = 'win';
            } else {
                balance = balance;
                status = 'lose';
                desc = history.description;
            }

            if (status == 'win') {
                let span = '';

                for (let i = 0; i < numberString.length; i++) {
                    span += `<span class="wt wt-${numberString[i]}"></span>`;
                }

                message = `<div class="wintext"><span class="wt wt-plus"></span>${span}</div>`;
            }

            user.balance = balance;
            await user.save();

            history.description = desc;
            history.result = status;
            history.paid = 'sent';
            await history.save();

            let histories = await historyModel.find({username: user.username}, {_id: 0, transId: 1, amount: 1, comment: 1, gameType: 1, result: 1, paid: 1, description: 1, createdAt: 1}).sort({ createdAt: -1 }).limit(10).lean();

            let dataPost = {
                success: true,
                username: user.username,
                dice: result.data.result.dice,
                status,
                balance,
                message,
                histories
            };

            let dataEncode = await securityHelper.encrypt(JSON.stringify(dataPost));

            socket.emit('cltx_telegram', dataEncode);
        } catch (e) {
            console.log(e);
        }
    }
}