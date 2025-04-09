const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const express = require("express");
const bankModel = require("../models/bank.model");
const oldBank = require('../json/bank.json');
const ncbBank = require('../json/ncb.bank.json');
const transferModel = require('../models/transfer.model');
const {HttpsProxyAgent} = require("https-proxy-agent");

exports.login = async (accountNumber, bankType) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const captchaToken = Array.from({ length: 30 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        const config = {
            maxBodyLength: Infinity,
            url: "https://www.ncb-bank.vn/nganhangso.khcn/gateway-server/personal-user-service/captcha",
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'browser-id': '278254206',
                'content-type': 'application/json;charset=UTF-8',
                'priority': 'u=1, i',
                'sec-ch-ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
            },
            method: "GET",
        };

        if (agent) {
            config.httpsAgent = agent;
        }

        const {data: responseCaptcha} = await axios(config);

        console.log(responseCaptcha)

        // const deviceId = this.generateDeviceId()
        //
        // let config = {
        //     maxBodyLength: Infinity,
        //     url: "https://www.ncb-bank.vn/nganhangso.khcn/gateway-server/oauth/token",
        //     headers: {
        //         'accept': 'application/json',
        //         'accept-language': 'vi',
        //         'authorization': 'Basic amF2YWRldmVsb3BlcnpvbmU6c2VjcmV0',
        //         'origin': 'https://www.ncb-bank.vn',
        //         'priority': 'u=1, i',
        //         'referer': 'https://www.ncb-bank.vn/nganhangso.khcn/dang-nhap',
        //         'sec-ch-ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        //         'sec-ch-ua-mobile': '?0',
        //         'sec-ch-ua-platform': '"Windows"',
        //         'sec-fetch-dest': 'empty',
        //         'sec-fetch-mode': 'cors',
        //         'sec-fetch-site': 'same-origin',
        //         'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
        //     },
        //     method: "POST",
        //     data: {
        //         'username': bankData.username,
        //         'password': bankData.password,
        //         'captcha': captchaText,
        //         'grant_type': 'password',
        //         'grant_service': 'IB',
        //         'grant_device': deviceId,
        //         'osname': 'EDGE',
        //         'osversion': '131.0.0.0',
        //         'deviceid': deviceId
        //     },
        // };
        //
        // const {data: response} = await axios(config);
        //
        // if (response.status == 'success') {
        //     await bankModel.findOneAndUpdate({accountNumber, bankType}, {
        //             $set: {
        //                 accessToken: response.accessToken,
        //                 loginStatus: 'active',
        //             }
        //         }
        //     );
        //
        //     return {
        //         success: true,
        //         message: 'Đăng nhập thành công'
        //     };
        // } else {
        //     return {
        //         success: false,
        //         message: 'Đăng nhập thất bại'
        //     };
        // }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.generateDeviceId = () => {
    const timestamp = Date.now().toString() + process.hrtime.bigint().toString(); // More precise timestamp
    const hash = crypto.createHash('sha256').update(timestamp).digest('hex');
    const fingerprint = hash.slice(0, 32); // First 32 characters
    return fingerprint;
}

exports.getCaptcha = () => {
    const captcha_token = "".join(random.choices(string.ascii_letters + string.digits, k=30))
    response = self.session.get(self.url["getCaptcha"] + captcha_token, headers={"user-agent": self.get_user_agent()},proxies=self.proxies)
    result = base64.b64encode(response.content).decode("utf-8")
    return result
}

exports.getUserAgent = () => {
    const userAgentArray = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36"
    ];
    const randomIndex = Math.floor(Math.random() * userAgentArray.length);
    return userAgentArray[randomIndex];
}

exports.confirm = async (data, accountNumber, bankType, history) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const checkBank = oldBank.data.find(bank => bank.bin === data.bankCode);
        const newBank = ncbBank.data.find(bank => bank.shortName === checkBank.shortName);

        let config = {
            maxBodyLength: Infinity,
            url: "https://www.ncb-bank.vn/nganhangso.khcn/gateway-server/personal-fund-transfer-service/transfer/quick-external-confirm",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${bankData.accessToken}`,
            },
            method: "POST",
            data: {
                "debitAcctNo": bankData.accountNumber,
                "creditAcctNo": data.accountNumber,
                "amount": data.amount,
                "note": data.comment,
                "debitAcctName": bankData.name,
                "creditAcctName": data.name,
                "bankCode": newBank.bankCode,
                "type": "ACCOUNT"
            },
        };

        const {data: response} = await axios(config);

        if (response.code == 5011) {
            return {
                success: false,
                message: `Tài khoản ${accountNumber} không đủ tiền`
            }
        }

        if (response.code == 200) {
            await transferModel.findOneAndUpdate({transId: history.transId}, {
                $set: {
                    transId: history.transId,
                    username: history.username,
                    firstMoney: 1,
                    amount: data.amount,
                    lastMoney: 2,
                    comment: data.comment,
                    details: response.data
                }
            }, {upsert: true});
            return await this.otp(response.data, accountNumber, bankType);
        }


    } catch (e) {
        console.log(e);
        await this.login(accountNumber, bankType);
        return;
    }
}

exports.otp = async (data, accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        let config = {
            maxBodyLength: Infinity,
            url: "https://www.ncb-bank.vn/nganhangso.khcn/gateway-server/personal-fund-transfer-service/transfer/generate-otp\n",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${bankData.accessToken}`,
            },
            method: "POST",
            data: {
                "creditAcctNo": data.creditAcctNo,
                "debitAcctNo": data.debitAcctNo,
                "amount": data.amount,
                "transactionCode": data.transactionCode,
                "time": moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss"),
                "otpMethod": "SMS",
                "otpLevel": null
            },
        };

        const {data: response} = await axios(config);

        if (response.code == 200) {
            return {
                success: true,
                message: 'Gửi OTP thành công!'
            };
        }

    } catch (e) {
        console.log(e);
    }
}

exports.verify = async (dataTransfer, accountNumber, bankType, otp, transId) => {
    try {

        const data = await transferModel.findOne({transId});
        const checkBank = oldBank.data.find(bank => bank.bin === dataTransfer.bankCode);
        const newBank = ncbBank.data.find(bank => bank.shortName === checkBank.shortName);

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        let config = {
            maxBodyLength: Infinity,
            url: "https://www.ncb-bank.vn/nganhangso.khcn/gateway-server/personal-fund-transfer-service/transfer/quick-external",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${bankData.accessToken}`,
            },
            method: "POST",
            data: {
                "debitAcctNo": bankData.accountNumber,
                "creditAcctNo": dataTransfer.accountNumber,
                "amount": dataTransfer.amount,
                "note": "",
                "otpMethod": "SMS",
                "otpLevel": null,
                "otp": otp,
                "transactionCode": data.details.transactionCode,
                "time": moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss"),
                "debitAcctName": bankData.name,
                "creditAcctName": dataTransfer.name,
                "bankCode": newBank.bankCode,
                "type": "ACCOUNT"
            },
        };

        const {data: response} = await axios(config);

        if (response.code == 200) {
            return response.data;
        }

    } catch (e) {
        console.log(e);
    }
}