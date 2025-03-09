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

exports.login = async (accountNumber, bankType) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        let config = {
            maxBodyLength: Infinity,
            url: "http://103.252.93.74/ncb/login",
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
            timeout: 60000,
            data: {
                "username": bankData.username,
                "password": bankData.password,
            },
        };

        const {data: response} = await axios(config);

        if (response.status == 'success') {
            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                    $set: {
                        accessToken: response.accessToken,
                        loginStatus: 'active',
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
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
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