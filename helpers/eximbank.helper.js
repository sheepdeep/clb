const axios = require("axios");
const path = require("path");
const moment = require("moment");
const express = require("express");
const bankModel = require("../models/bank.model");
const oldBank = require('../json/bank.json');
const ncbBank = require('../json/ncb.bank.json');
const transferModel = require('../models/transfer.model');
const historyModel = require('../models/history.model');
const userModel = require('../models/user.model');
const { v4: uuidv4 } = require("uuid");
const crypto = require('crypto');
const {HttpsProxyAgent} = require('https-proxy-agent');


exports.getCaptcha = async() => {
    try {
        const captchaToken = crypto.randomBytes(15).toString('hex');

        const headers = {
            'user-agent': await this.getUserAgent() // Replace with the logic for generating user-agent if necessary
        };

        let config = {
            responseType: 'arraybuffer',
            url: "https://edigi.eximbank.com.vn/ib/captcha/" + captchaToken,
            headers,
            method: "GET",
        };

        const {data: response} = await axios(config);
        const base64Img = Buffer.from(response, 'binary').toString('base64');
        return {
            captchaToken,
            base64Img
        };

    } catch(err) {
        console.log(err)
    }
}

exports.createTaskCaptcha = async() => {
    try {

        const data = await this.getCaptcha();

        const headers = {
            'user-agent': await this.getUserAgent() // Replace with the logic for generating user-agent if necessary
        };

        let config = {
            url: "http://103.72.96.214:8277/api/captcha/bidv",
            headers,
            method: "POST",
            data: {
                base64: data.base64Img
            }
        };

        const {data: response} = await axios(config);

        console.log(response);

        return {
            captcha: response.captcha,
            captchaToken: data.captchaToken
        }
    } catch(err) {
        console.log(err)
    }
};

exports.login = async (accountNumber, bankType) => {
    try {
        const bankData = await bankModel.findOne({ accountNumber, bankType }).lean();

        // Giải captcha
        const dataCaptcha = await this.createTaskCaptcha();

        const dataDevice = {
            "DT": "WINDOWS",
            "E": uuidv4().toString(),
            "OV": "124.0.0.0",
            "PM": "Edge",
        };

        // Tạo header mặc định
        headers = await this.headerDefault(null);

        const bodyData = {
            ...dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "captchaToken": dataCaptcha.captchaToken,
            "captchaValue": dataCaptcha.captcha,
            "clientId": "",
            "mid": 1,
            "authMethod": "SMS",
            "pin": bankData.password,
            "username": bankData.username,
        };

        // Kiểm tra proxy và tạo agent nếu cần thiết
        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl); // Sử dụng proxy nếu có
        }

        // Mã hóa dữ liệu cần gửi
        const encrypted_data = await this.encrypt_data(bodyData);

        let config = {
            maxBodyLength: Infinity,
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        // Nếu có proxy, thêm httpsAgent vào cấu hình
        if (agent) {
            config.httpsAgent = agent;
        }

        // Gửi yêu cầu POST
        const response = await axios(config);

        // Giải mã dữ liệu từ phản hồi
        const resultDecode = await this.decrypt_data(response.data);

        // Nếu mã lỗi là '96', gọi lại hàm login
        if (resultDecode.code == '96') {
            return this.login(accountNumber, bankType);
        }

        // Nếu mã lỗi là '00', cập nhật thông tin tài khoản và trả về kết quả
        if (resultDecode.code == '00') {

            await bankModel.findOneAndUpdate({ accountNumber, bankType }, {
                $set: {
                    name: resultDecode.data.name,
                    accountNumber,
                    bankType,
                    status: 'pending',
                    loginStatus: 'waitOTP',
                    otpToken: resultDecode.data.otpToken,
                    accessToken: response.headers['authorization'],
                    dataDevice,
                    otp: null,
                    reward: false
                }
            }, { upsert: true });

            return {
                message: "Thêm tài khoản thành công. Đang thực hiện lấy OTP xác thực!",
                success: true
            };
        } else {
            return {
                message: resultDecode.des,
                success: false
            };
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
};

exports.verifyOTP = async (accountNumber, bankType, otp) => {
    try {
        
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        headers = await this.headerDefault({Authorization: bankData.accessToken})
        console.log("Token lúc đăng nhập là " + bankData.accessToken)

        const bodyData = {
            ...bankData.dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "clientId": "",
            "mid": 2,
            "loginType":"3",
            "authMethod": "SMS",
            "otp": otp,
            "otpToken": bankData.otpToken,
        }

        const encrypted_data = await this.encrypt_data(bodyData)

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        let config = {
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        // Nếu có proxy, thêm httpsAgent vào cấu hình
        if (agent) {
            config.httpsAgent = agent;
        }

        const response = await axios(config);

        const resultDecode = await this.decrypt_data(response.data)
        
        if (resultDecode.code == '00') {

            const dataDevice = {
                ...bankData.dataDevice,
            }

            console.log(response.headers['authorization']);

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    accountNumber,
                    bankType,
                    status: 'active',
                    loginStatus: 'active',
                    accessToken: response.headers['authorization'],
                    dataDevice,
                    loginAt: new Date().toISOString(),
                    reward: false
                }
            }, {upsert: true})

            return {
                message: "Thêm tài khoản thành công. Đang thực hiện lấy OTP xác thực!",
                success: true
            }
        } else {
            return {
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.checkBank = async (accountNumber, bankType, bankCode, receiver) => {
    try {
        
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();
        console.log("Token lúc xác minh là " + bankData.accessToken)

        const headers = await this.headerDefault({Authorization: bankData.accessToken})

        const bodyData = {
            ...bankData.dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "clientId": "",
            "mid": 17,
            "authMethod": "SMS",
            "isCache": false,
            "maxRequestInCache": false,
            "bankCode": bankCode,
            "accountNo": receiver,
            "isCard": "0",
            "currentAccountNo": accountNumber,
        }

        const encrypted_data = await this.encrypt_data(bodyData)

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        let config = {
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        // Nếu có proxy, thêm httpsAgent vào cấu hình
        if (agent) {
            config.httpsAgent = agent;
        }

        const response = await axios(config);

        const resultDecode = await this.decrypt_data(response.data)
        
        if (resultDecode.code == '00') {
            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    accessToken: response.headers['authorization'],
                }
            }, {upsert: true})

            return {
                resultDecode,
                message: "Thêm tài khoản thành công. Đang thực hiện lấy OTP xác thực!",
                success: true
            }
        } else {
            return {
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.getBalance = async (accountNumber, bankType) => {
    try {
        
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();
        console.log("Token lúc xác minh là " + bankData.accessToken)

        const headers = await this.headerDefault({Authorization: bankData.accessToken})


        const bodyData = {
            ...bankData.dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "clientId": "",
            "authMethod": "SMS",
            "mid": 11,
            "isCache": false,
            "maxRequestInCache": false,
        }

        const encrypted_data = await this.encrypt_data(bodyData)

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        let config = {
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        if (agent) {
            config.httpsAgent = agent;
        }

        const response = await axios(config);

        const resultDecode = await this.decrypt_data(response.data)

        if (resultDecode.code == '00') {

            let config = {
                maxBodyLength: Infinity,
                url: "https://api.vietqr.io/v2/generate",
                method: "POST",
                data: {
                    accountNo: accountNumber,
                    accountName: bankData.name,
                    acqId: '970431',
                    template: 'compact'
                },
            };

            const responseQr = await axios(config);

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    accessToken: response.headers['authorization'],
                    contentQr: responseQr.data.data.qrCode,
                }
            }, {upsert: true})

            return {
                success: true,
                resultDecode
            };
        } else {
            return {
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        console.log(e);
        this.login(accountNumber, bankType)
        return {
            success: false,
            message: 'Lấy số dư thất bại! ' + e.message
        };
    }
}

exports.getHistory = async (accountNumber, bankType) => {
    try {

        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();
        console.log("Token lúc xác minh là " + bankData.accessToken)

        const headers = await this.headerDefault({Authorization: bankData.accessToken})


        const bodyData = {
            ...bankData.dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "clientId": "",
            "authMethod": "SMS",
            "mid": 11,
            "isCache": false,
            "maxRequestInCache": false,
        }

        const encrypted_data = await this.encrypt_data(bodyData)

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        let config = {
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        if (agent) {
            config.httpsAgent = agent;
        }

        const response = await axios(config);

        const resultDecode = await this.decrypt_data(response.data)

        if (resultDecode.code == '00') {

            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    accessToken: response.headers['authorization'],
                }
            }, {upsert: true})

            return {
                success: true,
                resultDecode
            };
        } else {
            return {
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        console.log(e);
        this.login(accountNumber, bankType)
        return {
            success: false,
            message: 'Lấy số dư thất bại! ' + e.message
        };
    }
}

exports.initTransfer = async (accountNumber, bankType, dataTransfer) => {
    try {
        
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();
        console.log("Token lúc lấy số dư là " + bankData.accessToken)

        const headers = await this.headerDefault({Authorization: bankData.accessToken})

        const bodyData = {
            ...bankData.dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "clientId": "",
            "mid": 21,
            "authMethod": "SMS",
            "otpToken": "",
            "isCache": false,
            "isExpress": 0,
            "maxRequestInCache": false,
            "sender": {
                "accountNo": accountNumber
            },
            "beneficiary": {
                "accountNo": dataTransfer.accountNumber,
                "ccy": "VND",
                "name": dataTransfer.name,
                "bankCode": dataTransfer.bankCode,
                "bankName": dataTransfer.bankName,
                "branchCode": "",
                "branchName": "",
                "cityCode": "",
                "cityName": "",
                "posCode": "",
                "posName": "",
                "idNumberType": "",
                "issueDate": "",
                "issuePlace": ""
            },
            "transactionInfo": {
                "amount": dataTransfer.amount,
                "ccy": "VND",
                "remark": dataTransfer.comment
            },
            "savedBene": 0,
            "nickname": "",
            "isFavorite": 0,
            "isQR": 0
        }

        const encrypted_data = await this.encrypt_data(bodyData)

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        let config = {
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        if (agent) {
            config.httpsAgent = agent;
        }

        const response = await axios(config);

        const resultDecode = await this.decrypt_data(response.data)
        
        if (resultDecode.code == '00') {
            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    otpToken: resultDecode.data.otpToken,
                    transType: resultDecode.data.transType,
                    token: resultDecode.data.token,
                    accessToken: response.headers['authorization'],
                }
            }, {upsert: true})

            return {
                resultDecode,
                message: "Tạo đơn chuyển tiền thành công!",
                success: true
            }
        } else {
            return {
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.verifyTransfer = async (accountNumber, bankType, otp) => {
    try {
        
        const bankData = await bankModel.findOne({accountNumber, bankType}).lean();

        headers = await this.headerDefault({Authorization: bankData.accessToken})

        const bodyData = {
            ...bankData.dataDevice,
            "ATS": moment().format('YYMMDDHHmmss'),
            "clientId": "",
            "mid": 16,
            "authMethod": "SMS",
            "token": bankData.token,
            "otpToken": bankData.otpToken,
            "transType": bankData.transType,
            "otp": otp
        }

        const encrypted_data = await this.encrypt_data(bodyData)

        let agent;
        if (bankData.proxy) {
            const proxyUrl = `http://${bankData.proxy}`;
            agent = new HttpsProxyAgent(proxyUrl);  // Sử dụng proxy nếu có
        }

        let config = {
            url: "https://edigi.eximbank.com.vn/ib/",
            headers,
            method: "POST",
            data: encrypted_data,
        };

        if (agent) {
            config.httpsAgent = agent;
        }
        
        const response = await axios(config);

        const resultDecode = await this.decrypt_data(response.data)
        
        if (resultDecode.code == '00') {
            await bankModel.findOneAndUpdate({accountNumber, bankType}, {
                $set: {
                    accessToken: response.headers['authorization'],
                }
            }, {upsert: true})
            return {
                resultDecode,
                message: "Tạo đơn chuyển tiền thành công!",
                success: true
            }
        } else {
            return {
                resultDecode,
                message: resultDecode.des,
                success: false
            }
        }
    } catch (e) {
        console.log(e);
        return {
            success: false,
            message: 'Đăng nhập thất bại'
        };
    }
}

exports.getUserAgent = async() => {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36';
}

exports.headerDefault = async(headers = null) => {
        // Generate a random 15-character string
    const randomNumberString = () => crypto.randomBytes(8).toString('hex').slice(0, 15);
    
    const defaultHeaders = {
        'Accept': 'application/json',
        'Accept-Language': 'vi',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Origin': 'https://edigi.eximbank.com.vn',
        'Referer': 'https://edigi.eximbank.com.vn/dang-nhap',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        "X-Request-ID": randomNumberString(),
        'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'user-anget': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36"
    };

    if (headers) {
        // Merge additional headers
        Object.assign(defaultHeaders, headers);
    }

    return defaultHeaders;
}

exports.encrypt_data = async(data) => {
    try {
        let config = {
            maxBodyLength: Infinity,
            url: "https://vcbbiz1.pay2world.vip/eximbank/encrypt",
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

exports.decrypt_data = async(data) => {
    try {
        let config = {
            maxBodyLength: Infinity,
            url: "https://vcbbiz1.pay2world.vip/eximbank/decrypt",
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