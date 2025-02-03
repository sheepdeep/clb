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

exports.solveCaptcha = async (apiUrl, base64Image) => {
    try {
        const response = await axios.post(apiUrl, {
            type: "imagetotext", key: "222e2809099938da51bffe3a654e7b80", img: base64Image
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
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        const browser = await puppeteer.launch({
            headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        let result;

        await page.goto("https://www.ncb-bank.vn/nganhangso.khcn/dang-nhap", {
            waitUntil: "networkidle2",
        });

        const captchaBase64 = await page.evaluate(() => {
            const img = document.querySelector("div.capcha img");
            return img ? img.src : null;
        });

        if (!captchaBase64) {
            return {
                success: false, message: 'Không tìm thấy captcha'
            }
        }

        const base64 = captchaBase64.replace(/^data:image\/png;base64,/, "");

        const captchaSolution = await this.solveCaptcha("https://autocaptcha.pro/apiv3/process", base64);


        await page.type('[formcontrolname="username"]', bankData.username);
        await page.type('[formcontrolname="password"]', bankData.password);
        await page.type('[formcontrolname="captcha"]', captchaSolution);

        page.on("response", async (response) => {
            if (response.url() === "https://www.ncb-bank.vn/nganhangso.khcn/gateway-server/oauth/token" && response.status() === 200) {
                result = await response.json();
            }
        });
        await page.click(".btn-login");

        await new Promise((resolve) => setTimeout(resolve, 2000));
        await browser.close();

        if (result && result.access_token) {

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                    $set: {
                        accessToken: result.access_token,
                        loginStatus: 'active'
                    }
                }
            );

            return {
                success: true,
                message: 'Đăng nhập thành công'
            };
        } else {
            return {
                success: false,
                message: 'Đăng nhập thất bại'
            };
        }

    } catch (e) {
        console.log(e);
    }
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