const {format} = require('date-fns');
const axios = require('axios');
const captchaHelper = require('../helpers/captcha.helper');
const bankModel = require('../models/bank.model');
const {MB} = require("mbbank");
const moment = require("moment-timezone");
const puppeteer = require("puppeteer");
const userModel = require("../models/user.model");
const historyModel = require("../models/history.model");
const gameService = require("../services/game.service");
const bankService = require("../services/bank.service");
const historyService = require("../services/history.service");
const historyHelper = require('../helpers/history.helper');
const settingModel = require('../models/setting.model');
const blockModel = require("../models/block.model");
const gameHelper = require("./game.helper");
const commentHelper = require("./comment.helper");
const telegramHelper = require("./telegram.helper");
const securityHelper = require("./security.helper");
const logHelper = require("./log.helper");
const crypto = require('crypto');

exports.solveCaptcha = async (apiUrl, base64Image) => {
    try {
        const response = await axios.post(apiUrl, {
            base64: base64Image
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
        });

        const result = response.data;

        if (result && result.captcha) {
            console.log("CAPTCHA đã được giải:", result.captcha);
            return result.captcha;
        } else {
            console.error("Lỗi khi giải CAPTCHA: Không nhận được kết quả hợp lệ.", result);
            return null;
        }
    } catch (error) {
        console.error("Lỗi khi giải CAPTCHA:", error);
        return null;
    }
}

exports.generate_device_id = () => {
    return "s1rmi184-mbib-0000-0000-" + moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss") + "00"
}

exports.login = async (accountNumber, bankType) => {

    const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

    const time = moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss") + "00";
    const deviceId = this.generate_device_id();

    let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://online.mbbank.com.vn/api/retail-web-internetbankingms/getCaptchaImage",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm'
        },
        data: {
            "refNo": `${bankData.username}-${time}`,
            "deviceIdCommon": deviceId,
            "sessionId": ""
        },
    };

    const response = await axios(config);

    const captchaText = await this.solveCaptcha("http://103.72.96.214:8277/api/captcha/mbbank", response.data.imageString);

    const bodyData = {
        "userId": bankData.username,
        "password": crypto.createHash('md5').update(bankData.password).digest('hex'),
        "captcha": captchaText,
        "ibAuthen2faString": "c7a1beebb9400375bb187daa33de9659",
        "sessionId": "",
        "refNo": `${bankData.username}-${time}`,
        "deviceIdCommon": deviceId,
    }

    const request_data = await this.encrypt_data(bodyData)

    const configLogin = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://online.mbbank.com.vn/api/retail_web/internetbanking/v2.0/doLogin",
        headers: {
            'Cache-Control': 'max-age=0',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': 'Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            "Origin": "https://online.mbbank.com.vn",
            "Referer": "https://online.mbbank.com.vn/pl/login?returnUrl=%2F",
            "Content-Type": "application/json; charset=UTF-8",
            'app': "MB_WEB",
            "X-Request-Id": `${bankData.username}-${time}`,
            "Deviceid": deviceId,
            "refNo": `${bankData.username}-${time}`,
            "elastic-apm-traceparent": "00-55b950e3fcabc785fa6db4d7deb5ef73-8dbd60b04eda2f34-01",
            "Sec-Ch-Ua": '"Not.A/Brand";v="8", "Chromium";v="134", "Google Chrome";v="134"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        data: request_data,
    }

    const {data: responseLogin} = await axios(configLogin);


    if (responseLogin && responseLogin.result && responseLogin.result.responseCode === "00") {

        await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    accessToken: responseLogin.sessionId,
                    // name: responseLogin.cust.defaultAccount.acctNm,
                    dataDevice: {
                        device: responseLogin.cust.deviceId
                    },
                    loginStatus: 'active'
                }
            }
        );

        return {
            success: true,
            message: 'Đăng nhập thành công'
        };
    }
}

exports.encrypt_data = async(data) => {
    try {
        let config = {
            maxBodyLength: Infinity,
            url: "https://mbcrypt1.pay2world.vip/encrypt",
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
            data
        };

        const {data: response} = await axios(config);

        return response
    } catch (err) {
        console.log(err)
    }
}

exports.generate_ref_no = (username) => {
    return username +'-'+ this.get_time_now()+'-'+ str(random.randint(10000, 99999))
}

exports.history = async (accountNumber, bankType, timeStart = null, timeEnd = null) => {

    const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

    const time = moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss") + "00";
    let data = {
        accountNo: accountNumber,
        fromDate: timeStart ? timeStart : moment().format("DD/MM/YYYY"),
        toDate: timeEnd ? timeEnd : moment().format("DD/MM/YYYY"),
        sessionId: bankData.accessToken,
        refNo: `${bankData.accountNumber}-${time}`,
        deviceIdCommon: bankData.dataDevice.device,
    };
    let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://online.mbbank.com.vn/api/retail-transactionms/transactionms/get-account-transaction-history",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
            'RefNo': `${bankData.accountNumber}-${time}`,
            'Deviceid': bankData.dataDevice.device,
            'X-Request-Id': `${bankData.accountNumber}-${time}`,
        },
        data: data,
    };

    try {
        const response = await axios.request(config);
        const responseData = response.data;
        return responseData.transactionHistoryList;

    } catch (error) {
        console.log("Lỗi khi lấy dữ liệu, thử lại sau:", error);
        return false;
    }

}

exports.handleTransId = async (histories, bank, band = 0) => {
    try {

        const dataSetting = await settingModel.findOne();

        for (let history of histories) {

            //TODO: Kiểm tra thành viên có đúng không
            let {
                creditAmount: amount,
                refNo: transId,
                addDescription: transactionDesc,
                description,
                bankName,
                transactionDate
            } = history;

            //TODO: Kiểm tra mã giao dịch đã có trong hệ thống chưa
            if (await historyModel.findOne({transId})) {
                continue;
            }

            if (history.creditAmount > 0) {
                amount = parseInt(amount);

                const {username, comment} = await historyHelper.handleDesc(description);

                let user = await userModel.findOne({username}).lean();

                if (!user) {

                    await historyModel.findOneAndUpdate({transId}, {
                        $set: {
                            transId,
                            receiver: bank.accountNumber,
                            amount,
                            fullComment: description,
                            result: 'notUser',
                            comment: description,
                            timeCheck: new Date(),
                            timeTLS: moment(transactionDate, 'DD/MM/YYYY HH:mm:ss').format()
                        }
                    }, {upsert: true}).lean();
                    continue;
                }

                let ip;
                if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
                    const parts = ip.split('.');
                    ip = parts.slice(0, 2).join('.'); // Lấy 2 số đầu
                }

                ip = user.ip;

                let countUser = await userModel.aggregate([{ $match: { ip: { $regex: ip } } }, { $group: { _id: null, count: { $sum: 1 } } }]);
                if (countUser.length > 0 && countUser[0].count > 2) {
                    await historyModel.findOneAndUpdate({transId}, {
                        $set: {
                            username,
                            transId,
                            receiver: bank.accountNumber,
                            amount,
                            fullComment: description,
                            result: 'lose',
                            paid: 'sent',
                            comment: description,
                            description: 'SPAM TẠO NICK',
                            timeCheck: new Date(),
                            timeTLS: moment(transactionDate, 'DD/MM/YYYY HH:mm:ss').format()
                        }
                    }, {upsert: true}).lean();
                    continue;
                }

                if (amount > 0) {
                    if (comment === dataSetting.paymentComment) {

                        const result = await bankService.limitBet(bank.accountNumber, amount)
                        if (!result) {
                            await userModel.findOneAndUpdate({username}, {$set: {
                                    balance: user.balance + amount,
                                }});
                            await historyModel.findOneAndUpdate({transId}, {
                                $set: {
                                    transId,
                                    username: user.username,
                                    receiver: bank.accountNumber,
                                    gameName: 'RECHARGE',
                                    gameType: `RECHARGE`,
                                    amount,
                                    fullComment: description,
                                    result: 'ok',
                                    paid: 'sent',
                                    isCheck: false,
                                    comment,
                                    timeTLS: new Date(),
                                    description: `Bạn đã nạp tiềnn vào tài khoản <span class="code-num">${Intl.NumberFormat('en-US').format(amount)}</span> vnđ. (SB: ${Intl.NumberFormat('en-US').format(user.balance)} -&gt; ${Intl.NumberFormat('en-US').format(user.balance + amount)})`,
                                }
                            }, {upsert: true}).lean();
                        }

                        continue;
                    }

                    if (comment === dataSetting.xsmb.commentLo || comment === dataSetting.xsmb.commentDe || comment === dataSetting.xsmb.commentXien2) {
                        await historyHelper.handleXsmb(history, bank);
                        continue;
                    }

                    await historyHelper.handleCltx(history, bank);
                }
            }


        }

        return 1;
    } catch (e) {
        console.log(e);
    }
}
