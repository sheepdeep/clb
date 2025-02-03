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

exports.login = async (accountNumber, bankType) => {

    const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    let result;
    try {
        await page.goto("https://online.mbbank.com.vn", {
            waitUntil: "networkidle2",
        });
        const captchaBase64 = await page.evaluate(() => {
            const img = document.querySelector("img.ng-star-inserted");
            return img ? img.src : null;
        });
        if (!captchaBase64) {
            return {
                success: false,
                message: 'Không tìm thấy CAPTCHA'
            };
        }
        const base64 = captchaBase64.replace(/^data:image\/png;base64,/, "");
        const captchaSolution = await this.solveCaptcha(
            "http://103.153.64.187:8277/api/captcha/mbbank",
            base64
        );
        if (!captchaSolution) {
            return {
                success: false,
                message: 'Không thể giải CAPTCHA'
            };
        }
        await page.type("#user-id", bankData.username);
        await page.type("#new-password", bankData.password);
        await page.type('input[placeholder="NHẬP MÃ KIỂM TRA"]', captchaSolution);
        page.on("response", async (response) => {
            if (
                response.url() ===
                "https://online.mbbank.com.vn/api/retail_web/internetbanking/v2.0/doLogin" &&
                response.status() === 200
            ) {
                result = await response.json();
            }
        });
        await page.click("#login-btn");
    } catch (error) {
        console.error("Lỗi:", error.message);
    } finally {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await browser.close();
        if (result && result.result && result.result.responseCode === "00") {

            // saveTempData({ loginResult: result });
            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                    $set: {
                        accessToken: result.sessionId,
                        name: result.cust.defaultAccount.acctNm,
                        dataDevice: {
                            device: result.cust.deviceId
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
            app: "MB_WEB",
            Authorization: "Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm",
            Deviceid: bankData.dataDevice.device,
            Host: "online.mbbank.com.vn",
            Origin: "https://online.mbbank.com.vn",
            Referer:
                "https://online.mbbank.com.vn/information-account/source-account",
            "elastic-apm-traceparent":
                "00-a51b571404faaec6ef53aed9d6bfea9b-e3dae75d72250c39-01",
            Refno: `${bankData.accountNumber}-${time}`,
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-Request-Id": `${bankData.accountNumber}-${time}`,
            "Content-Type": "application/json",
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

exports.handleDesc = async (description) => {
    const desc = description.split(' ');

    return {
        username: desc[0],
        comment: desc[1]
    }
},

exports.handleTransId = async (histories, bank, band = 0) => {
    try {

        let status = 'wait';
        let check = 0;

        for (let history of histories) {

            let {creditAmount: amount, refNo: transId, addDescription: transactionDesc, description, bankName} = history;

            amount = parseInt(amount);

            const {username, comment} = await this.handleDesc(transactionDesc);

            // Kiem tra user
            let user = await userModel.findOne({username}).lean();

            // console.log(user);
            // Nhận tiền
            if (amount > 0 && !await historyModel.findOne({transId}).lean()) {

                let {gameName, gameType} = await gameService.checkGame(comment);

                if ((!gameName || !gameType)) status = 'errorComment';

                if (!user) status = 'notUser';

                if (status === 'wait' && await bankService.limitBet(bank.accountNumber, amount)) status = !await historyService.refundCount(user.username, dataSetting.refund.limit || 10) ? 'limitRefund' : 'limitBet';

                if (band) {
                    status = 'handwork'; user = null;
                }

                await historyModel.findOneAndUpdate({transId}, {
                    $set: {
                        transId,
                        username: !user ? null : user.username,
                        receiver: bank.accountNumber,
                        gameName,
                        gameType,
                        amount,
                        fullComment: description,
                        result: status,
                        isCheck: bankName == 'MB' ? false : true,
                        comment,
                        timeTLS: new Date()
                    }
                }, {upsert: true}).lean();

                await historyHelper.handleTransId(transId);

                check++;
            }
        }

        return check;
    } catch (e) {
        console.log(e);
    }
}